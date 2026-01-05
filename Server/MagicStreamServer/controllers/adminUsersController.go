package controllers

import (
	"context"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/database"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/utils"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func normalizeRole(role string) (string, bool) {
	if role == "" {
		return "", true
	}
	r := strings.ToUpper(strings.TrimSpace(role))
	switch r {
	case "ADMIN", "USER":
		return r, true
	default:
		return "", false
	}
}

func normalizeSubscriptionFilter(s string) (string, bool) {
	if s == "" {
		return "", true
	}
	v := strings.ToUpper(strings.TrimSpace(s))
	switch v {
	case "ACTIVE", "CANCELED", "EXPIRED", "NONE":
		return v, true
	default:
		return "", false
	}
}

func computeSubscriptionStatus(status string, expiresAt time.Time, hasSubscription bool, now time.Time) (string, bool) {
	if !hasSubscription {
		return "NONE", false
	}
	if !expiresAt.After(now) {
		return "EXPIRED", false
	}
	switch status {
	case "ACTIVE":
		return "ACTIVE", true
	case "CANCELED":
		return "CANCELED", true
	default:
		// Fallback for unexpected statuses while still not expired.
		return status, false
	}
}

// AdminListUsers returns a paginated list of users with subscription summary and activity counts.
// Admin-only route (protected by RequireAdmin middleware).
func AdminListUsers(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		// Query params
		q := strings.TrimSpace(c.Query("q"))
		roleParam := c.Query("role")
		subParam := c.Query("subscription")
		limitStr := c.Query("limit")
		pageStr := c.Query("page")

		role, ok := normalizeRole(roleParam)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role filter"})
			return
		}

		subscriptionFilter, ok := normalizeSubscriptionFilter(subParam)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription filter"})
			return
		}

		// Pagination defaults
		var limit int64 = 20
		if limitStr != "" {
			if parsed, err := strconv.ParseInt(limitStr, 10, 64); err == nil && parsed > 0 {
				limit = parsed
			}
		}
		if limit > 200 {
			limit = 200
		}

		var page int64 = 1
		if pageStr != "" {
			if parsed, err := strconv.ParseInt(pageStr, 10, 64); err == nil && parsed > 0 {
				page = parsed
			}
		}
		skip := (page - 1) * limit

		userCollection := database.OpenCollection("users", client)
		now := time.Now()

		// Base match (email + role)
		userMatch := bson.M{}
		if q != "" {
			escaped := regexp.QuoteMeta(q)
			userMatch["email"] = bson.M{
				"$regex":   escaped,
				"$options": "i",
			}
		}
		if role != "" {
			userMatch["role"] = role
		}

		pipeline := []bson.M{
			{"$match": userMatch},
			// Lookup latest subscription for each user
			{"$lookup": bson.M{
				"from": "subscriptions",
				"let":  bson.M{"uid": "$user_id"},
				"pipeline": []bson.M{
					{"$match": bson.M{
						"$expr": bson.M{"$eq": []interface{}{"$user_id", "$$uid"}},
					}},
					{"$sort": bson.M{"created_at": -1}},
					{"$limit": 1},
				},
				"as": "latest_subscription",
			}},
			{"$unwind": bson.M{
				"path":                       "$latest_subscription",
				"preserveNullAndEmptyArrays": true,
			}},
			// Compute subscription fields used for filtering + response
			{"$addFields": bson.M{
				"subscription_plan_id":    "$latest_subscription.plan_id",
				"subscription_raw_status": "$latest_subscription.status",
				"subscription_expires_at": "$latest_subscription.expires_at",
				"subscription_can_stream": bson.M{
					"$and": []bson.M{
						{"$in": []interface{}{"$latest_subscription.status", []string{"ACTIVE", "CANCELED"}}},
						{"$gt": []interface{}{"$latest_subscription.expires_at", now}},
					},
				},
				"subscription_status": bson.M{
					"$switch": bson.M{
						"branches": []bson.M{
							{
								"case": bson.M{"$eq": []interface{}{"$latest_subscription", nil}},
								"then": "NONE",
							},
							{
								"case": bson.M{"$lte": []interface{}{"$latest_subscription.expires_at", now}},
								"then": "EXPIRED",
							},
							{
								"case": bson.M{"$eq": []interface{}{"$latest_subscription.status", "ACTIVE"}},
								"then": "ACTIVE",
							},
							{
								"case": bson.M{"$eq": []interface{}{"$latest_subscription.status", "CANCELED"}},
								"then": "CANCELED",
							},
						},
						"default": "NONE",
					},
				},
			}},
		}

		if subscriptionFilter != "" {
			pipeline = append(pipeline, bson.M{"$match": bson.M{"subscription_status": subscriptionFilter}})
		}

		// Facet: items (with plan + counts) and total count
		pipeline = append(pipeline, bson.M{
			"$facet": bson.M{
				"items": []bson.M{
					{"$sort": bson.M{"created_at": -1}},
					{"$skip": skip},
					{"$limit": limit},
					// Plan lookup (optional)
					{"$lookup": bson.M{
						"from":         "plans",
						"localField":   "subscription_plan_id",
						"foreignField": "plan_id",
						"as":           "plan",
					}},
					{"$unwind": bson.M{
						"path":                       "$plan",
						"preserveNullAndEmptyArrays": true,
					}},
					// Ratings count
					{"$lookup": bson.M{
						"from": "ratings",
						"let":  bson.M{"uid": "$user_id"},
						"pipeline": []bson.M{
							{"$match": bson.M{"$expr": bson.M{"$eq": []interface{}{"$user_id", "$$uid"}}}},
							{"$count": "count"},
						},
						"as": "ratings_meta",
					}},
					{"$addFields": bson.M{
						"ratings_count": bson.M{
							"$ifNull": []interface{}{
								bson.M{"$arrayElemAt": []interface{}{"$ratings_meta.count", 0}},
								int64(0),
							},
						},
					}},
					// Watchlist count
					{"$lookup": bson.M{
						"from": "watchlists",
						"let":  bson.M{"uid": "$user_id"},
						"pipeline": []bson.M{
							{"$match": bson.M{"$expr": bson.M{"$eq": []interface{}{"$user_id", "$$uid"}}}},
							{"$count": "count"},
						},
						"as": "watchlist_meta",
					}},
					{"$addFields": bson.M{
						"watchlist_count": bson.M{
							"$ifNull": []interface{}{
								bson.M{"$arrayElemAt": []interface{}{"$watchlist_meta.count", 0}},
								int64(0),
							},
						},
					}},
					// Final shape (never return password/token/refresh_token)
					{"$project": bson.M{
						"_id":            0,
						"user_id":        1,
						"first_name":     1,
						"last_name":      1,
						"email":          1,
						"role":           1,
						"email_verified": 1,
						"created_at":     1,
						"updated_at":     "$update_at",
						"subscription": bson.M{
							"status":     "$subscription_status",
							"plan_id":    "$subscription_plan_id",
							"plan_name":  "$plan.name",
							"expires_at": "$subscription_expires_at",
							"can_stream": "$subscription_can_stream",
						},
						"activity": bson.M{
							"ratings_count":   "$ratings_count",
							"watchlist_count": "$watchlist_count",
						},
					}},
				},
				"total": []bson.M{
					{"$count": "count"},
				},
			},
		})

		type facetTotal struct {
			Count int64 `bson:"count"`
		}
		type facetResult struct {
			Items []bson.M     `bson:"items"`
			Total []facetTotal `bson:"total"`
		}

		cursor, err := userCollection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}
		defer cursor.Close(ctx)

		var results []facetResult
		if err := cursor.All(ctx, &results); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode users"})
			return
		}

		items := []bson.M{}
		total := int64(0)
		if len(results) > 0 {
			items = results[0].Items
			if len(results[0].Total) > 0 {
				total = results[0].Total[0].Count
			}
		}

		totalPages := int64(1)
		if limit > 0 {
			if total == 0 {
				totalPages = 0
			} else {
				totalPages = (total + limit - 1) / limit
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"items":      items,
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		})
	}
}

// AdminGetUser returns a single user's details for admin management.
// Admin-only route (protected by RequireAdmin middleware).
func AdminGetUser(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		targetUserID := strings.TrimSpace(c.Param("user_id"))
		if targetUserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
			return
		}

		userCollection := database.OpenCollection("users", client)
		subscriptionCollection := database.OpenCollection("subscriptions", client)
		planCollection := database.OpenCollection("plans", client)
		ratingCollection := database.OpenCollection("ratings", client)
		watchlistCollection := database.OpenCollection("watchlists", client)

		// Load user with projection (never return password/token/refresh_token)
		userProjection := bson.M{
			"password":      0,
			"token":         0,
			"refresh_token": 0,
		}
		var userDoc bson.M
		if err := userCollection.FindOne(
			ctx,
			bson.D{{Key: "user_id", Value: targetUserID}},
			options.FindOne().SetProjection(userProjection),
		).Decode(&userDoc); err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
			return
		}

		// Latest subscription (if any)
		var subDoc bson.M
		subErr := subscriptionCollection.FindOne(
			ctx,
			bson.D{{Key: "user_id", Value: targetUserID}},
			options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}}),
		).Decode(&subDoc)

		now := time.Now()
		hasSubscription := subErr == nil

		rawStatus := ""
		planID := ""
		var expiresAt time.Time

		if hasSubscription {
			if v, ok := subDoc["status"].(string); ok {
				rawStatus = v
			}
			if v, ok := subDoc["plan_id"].(string); ok {
				planID = v
			}
			if v, ok := subDoc["expires_at"].(time.Time); ok {
				expiresAt = v
			}
		}

		subStatus, canStream := computeSubscriptionStatus(rawStatus, expiresAt, hasSubscription, now)
		planName := ""
		if planID != "" {
			var plan bson.M
			if err := planCollection.FindOne(ctx, bson.D{{Key: "plan_id", Value: planID}}).Decode(&plan); err == nil {
				if n, ok := plan["name"].(string); ok {
					planName = n
				}
			}
		}

		ratingsCount, _ := ratingCollection.CountDocuments(ctx, bson.D{{Key: "user_id", Value: targetUserID}})
		watchlistCount, _ := watchlistCollection.CountDocuments(ctx, bson.D{{Key: "user_id", Value: targetUserID}})

		c.JSON(http.StatusOK, gin.H{
			"user": userDoc,
			"subscription": gin.H{
				"status":     subStatus,
				"plan_id":    planID,
				"plan_name":  planName,
				"expires_at": expiresAt,
				"can_stream": canStream,
			},
			"activity": gin.H{
				"ratings_count":   ratingsCount,
				"watchlist_count": watchlistCount,
			},
		})
	}
}

// AdminUpdateUserRole promotes/demotes a user between USER and ADMIN.
// Admin-only route (protected by RequireAdmin middleware).
func AdminUpdateUserRole(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		adminUserID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		targetUserID := strings.TrimSpace(c.Param("user_id"))
		if targetUserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
			return
		}

		// Recommended safety: do not allow admins to change their own role
		if targetUserID == adminUserID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot change your own role"})
			return
		}

		var req struct {
			Role string `json:"role" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		newRole, ok := normalizeRole(req.Role)
		if !ok || newRole == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Role must be ADMIN or USER"})
			return
		}

		userCollection := database.OpenCollection("users", client)
		filter := bson.D{{Key: "user_id", Value: targetUserID}}
		update := bson.M{
			"$set": bson.M{
				"role":      newRole,
				"update_at": time.Now(),
			},
		}

		result, err := userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
			return
		}
		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		// Return updated user (sanitized)
		userProjection := bson.M{
			"password":      0,
			"token":         0,
			"refresh_token": 0,
		}
		var userDoc bson.M
		if err := userCollection.FindOne(ctx, filter, options.FindOne().SetProjection(userProjection)).Decode(&userDoc); err != nil {
			c.JSON(http.StatusOK, gin.H{"message": "User role updated"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "User role updated",
			"user":    userDoc,
		})
	}
}



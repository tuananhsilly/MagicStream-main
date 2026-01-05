package controllers

import (
	"context"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/database"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func normalizeSubscriptionListStatusFilter(s string) (string, bool) {
	if s == "" {
		return "", true
	}
	v := strings.ToUpper(strings.TrimSpace(s))
	switch v {
	case "ACTIVE", "CANCELED", "EXPIRED":
		return v, true
	default:
		return "", false
	}
}

func normalizePaymentStatusFilter(s string) (string, bool) {
	if s == "" {
		return "", true
	}
	v := strings.ToUpper(strings.TrimSpace(s))
	switch v {
	case "SUCCESS", "PENDING", "FAILED", "REFUNDED":
		return v, true
	default:
		return "", false
	}
}

func normalizeGranularity(s string) (string, bool) {
	if s == "" {
		return "day", true
	}
	v := strings.ToLower(strings.TrimSpace(s))
	switch v {
	case "day", "week", "month":
		return v, true
	default:
		return "", false
	}
}

func parseDateOrDateTime(s string) (time.Time, bool, error) {
	// returns (parsedTime, hasTimeComponent, error)
	if strings.TrimSpace(s) == "" {
		return time.Time{}, false, nil
	}

	trimmed := strings.TrimSpace(s)

	// Heuristic: RFC3339 timestamps include 'T'
	if strings.Contains(trimmed, "T") {
		t, err := time.Parse(time.RFC3339, trimmed)
		if err != nil {
			return time.Time{}, false, err
		}
		return t, true, nil
	}

	// Date-only (HTML <input type="date">)
	t, err := time.Parse("2006-01-02", trimmed)
	if err != nil {
		return time.Time{}, false, err
	}
	return t, false, nil
}

func buildTimeRangeFilter(field string, fromStr string, toStr string) (bson.M, error) {
	filter := bson.M{}

	fromT, fromHasTime, err := parseDateOrDateTime(fromStr)
	if err != nil {
		return nil, err
	}
	toT, toHasTime, err := parseDateOrDateTime(toStr)
	if err != nil {
		return nil, err
	}

	rangeExpr := bson.M{}
	if !fromT.IsZero() {
		// from date-only starts at midnight UTC; from datetime uses exact time
		_ = fromHasTime
		rangeExpr["$gte"] = fromT
	}

	if !toT.IsZero() {
		if toHasTime {
			rangeExpr["$lte"] = toT
		} else {
			// date-only "to" is inclusive: < next day
			rangeExpr["$lt"] = toT.AddDate(0, 0, 1)
		}
	}

	if len(rangeExpr) > 0 {
		filter[field] = rangeExpr
	}

	return filter, nil
}

func periodKeyExpr(dateField string, granularity string) bson.M {
	switch granularity {
	case "month":
		// First day of month for stable sorting/labeling.
		return bson.M{"$dateToString": bson.M{"format": "%Y-%m-01", "date": dateField}}
	case "week":
		weekStartDate := bson.M{
			"$dateFromParts": bson.M{
				"isoWeekYear":   bson.M{"$isoWeekYear": dateField},
				"isoWeek":       bson.M{"$isoWeek": dateField},
				"isoDayOfWeek":  1, // Monday
			},
		}
		return bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": weekStartDate}}
	case "day":
		fallthrough
	default:
		return bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": dateField}}
	}
}

// AdminListSubscriptions lists subscriptions with joined user + plan information and effective status (EXPIRED based on expires_at).
func AdminListSubscriptions(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		q := strings.TrimSpace(c.Query("q"))
		statusParam := c.Query("status")
		planID := strings.TrimSpace(c.Query("plan_id"))
		fromStr := c.Query("from")
		toStr := c.Query("to")
		limitStr := c.Query("limit")
		pageStr := c.Query("page")

		statusFilter, ok := normalizeSubscriptionListStatusFilter(statusParam)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status filter"})
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

		subscriptionCollection := database.OpenCollection("subscriptions", client)
		now := time.Now()

		and := make([]bson.M, 0, 6)

		if planID != "" {
			and = append(and, bson.M{"plan_id": planID})
		}

		createdAtFilter, err := buildTimeRangeFilter("created_at", fromStr, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date range"})
			return
		}
		if len(createdAtFilter) > 0 {
			and = append(and, createdAtFilter)
		}

		if statusFilter != "" {
			switch statusFilter {
			case "ACTIVE", "CANCELED":
				and = append(and, bson.M{
					"status":     statusFilter,
					"expires_at": bson.M{"$gt": now},
				})
			case "EXPIRED":
				and = append(and, bson.M{
					"$or": []bson.M{
						{"expires_at": bson.M{"$lte": now}},
						{"status": "EXPIRED"},
					},
				})
			}
		}

		pipeline := []bson.M{}
		if len(and) > 0 {
			pipeline = append(pipeline, bson.M{"$match": bson.M{"$and": and}})
		}

		// Join user + plan for filtering/display.
		pipeline = append(pipeline,
			bson.M{"$lookup": bson.M{
				"from":         "users",
				"localField":   "user_id",
				"foreignField": "user_id",
				"as":           "user",
			}},
			bson.M{"$unwind": bson.M{"path": "$user", "preserveNullAndEmptyArrays": true}},
			bson.M{"$lookup": bson.M{
				"from":         "plans",
				"localField":   "plan_id",
				"foreignField": "plan_id",
				"as":           "plan",
			}},
			bson.M{"$unwind": bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}},
			// Effective status: EXPIRED if expires_at <= now, else raw status
			bson.M{"$addFields": bson.M{
				"effective_status": bson.M{
					"$cond": bson.M{
						"if":   bson.M{"$lte": []interface{}{"$expires_at", now}},
						"then": "EXPIRED",
						"else": "$status",
					},
				},
			}},
		)

		if q != "" {
			escaped := regexp.QuoteMeta(q)
			regex := bson.M{"$regex": escaped, "$options": "i"}
			pipeline = append(pipeline, bson.M{"$match": bson.M{
				"$or": []bson.M{
					{"user_id": regex},
					{"user.email": regex},
				},
			}})
		}

		pipeline = append(pipeline, bson.M{
			"$facet": bson.M{
				"items": []bson.M{
					{"$sort": bson.M{"created_at": -1}},
					{"$skip": skip},
					{"$limit": limit},
					{"$project": bson.M{
						"_id":            1,
						"user_id":        1,
						"user_email":     "$user.email",
						"plan_id":        1,
						"plan_name":      "$plan.name",
						"status":         "$effective_status",
						"started_at":     1,
						"expires_at":     1,
						"next_billing_at": 1,
						"payment_method": 1,
						"auto_renew":     1,
						"created_at":     1,
						"updated_at":     1,
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

		cursor, err := subscriptionCollection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscriptions"})
			return
		}
		defer cursor.Close(ctx)

		var results []facetResult
		if err := cursor.All(ctx, &results); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode subscriptions"})
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

		// Convert _id ObjectID -> hex string for API response
		for i := range items {
			if oid, ok := items[i]["_id"].(bson.ObjectID); ok {
				items[i]["_id"] = oid.Hex()
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

// AdminCancelSubscription cancels (turns off auto-renew) without changing expires_at.
func AdminCancelSubscription(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		idStr := strings.TrimSpace(c.Param("id"))
		oid, err := bson.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription id"})
			return
		}

		subscriptionCollection := database.OpenCollection("subscriptions", client)
		now := time.Now()

		filter := bson.D{{Key: "_id", Value: oid}}
		update := bson.M{"$set": bson.M{
			"status":     "CANCELED",
			"auto_renew": false,
			"updated_at": now,
		}}

		result, err := subscriptionCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel subscription"})
			return
		}
		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Subscription cancelled"})
	}
}

// AdminActivateSubscription activates a subscription; if expired, it renews for 1 month.
// It also cancels any other ACTIVE subscriptions for the same user_id to enforce one-active-per-user.
func AdminActivateSubscription(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		idStr := strings.TrimSpace(c.Param("id"))
		oid, err := bson.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription id"})
			return
		}

		subscriptionCollection := database.OpenCollection("subscriptions", client)

		// Load subscription (need user_id + expires_at)
		var sub bson.M
		if err := subscriptionCollection.FindOne(ctx, bson.D{{Key: "_id", Value: oid}}).Decode(&sub); err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscription"})
			return
		}

		userID, _ := sub["user_id"].(string)
		if userID == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Subscription has no user_id"})
			return
		}

		now := time.Now()

		// Cancel other ACTIVE subscriptions for this user (except this one)
		otherFilter := bson.M{
			"user_id": userID,
			"status":  "ACTIVE",
			"_id":     bson.M{"$ne": oid},
		}
		otherUpdate := bson.M{"$set": bson.M{
			"status":     "CANCELED",
			"auto_renew": false,
			"updated_at": now,
		}}
		_, _ = subscriptionCollection.UpdateMany(ctx, otherFilter, otherUpdate)

		// Build activate update (renew if expired)
		setFields := bson.M{
			"status":     "ACTIVE",
			"auto_renew": true,
			"updated_at": now,
		}

		if expiresAt, ok := sub["expires_at"].(time.Time); ok {
			if !expiresAt.After(now) {
				newExpires := now.AddDate(0, 1, 0)
				setFields["started_at"] = now
				setFields["expires_at"] = newExpires
				setFields["next_billing_at"] = newExpires
			}
		} else {
			// If expires_at missing/invalid, treat as expired and renew.
			newExpires := now.AddDate(0, 1, 0)
			setFields["started_at"] = now
			setFields["expires_at"] = newExpires
			setFields["next_billing_at"] = newExpires
		}

		filter := bson.D{{Key: "_id", Value: oid}}
		update := bson.M{"$set": setFields}

		result, err := subscriptionCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate subscription"})
			return
		}
		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Subscription activated"})
	}
}

// AdminListPayments lists payments with joined user + plan information.
func AdminListPayments(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		q := strings.TrimSpace(c.Query("q"))
		statusParam := c.Query("status")
		planID := strings.TrimSpace(c.Query("plan_id"))
		fromStr := c.Query("from")
		toStr := c.Query("to")
		limitStr := c.Query("limit")
		pageStr := c.Query("page")

		statusFilter, ok := normalizePaymentStatusFilter(statusParam)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status filter"})
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

		paymentCollection := database.OpenCollection("payments", client)

		and := make([]bson.M, 0, 6)
		if planID != "" {
			and = append(and, bson.M{"plan_id": planID})
		}
		if statusFilter != "" {
			and = append(and, bson.M{"status": statusFilter})
		}
		createdAtFilter, err := buildTimeRangeFilter("created_at", fromStr, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date range"})
			return
		}
		if len(createdAtFilter) > 0 {
			and = append(and, createdAtFilter)
		}

		pipeline := []bson.M{}
		if len(and) > 0 {
			pipeline = append(pipeline, bson.M{"$match": bson.M{"$and": and}})
		}

		pipeline = append(pipeline,
			bson.M{"$lookup": bson.M{
				"from":         "users",
				"localField":   "user_id",
				"foreignField": "user_id",
				"as":           "user",
			}},
			bson.M{"$unwind": bson.M{"path": "$user", "preserveNullAndEmptyArrays": true}},
			bson.M{"$lookup": bson.M{
				"from":         "plans",
				"localField":   "plan_id",
				"foreignField": "plan_id",
				"as":           "plan",
			}},
			bson.M{"$unwind": bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}},
		)

		if q != "" {
			escaped := regexp.QuoteMeta(q)
			regex := bson.M{"$regex": escaped, "$options": "i"}
			pipeline = append(pipeline, bson.M{"$match": bson.M{
				"$or": []bson.M{
					{"user_id": regex},
					{"transaction_id": regex},
					{"user.email": regex},
				},
			}})
		}

		pipeline = append(pipeline, bson.M{
			"$facet": bson.M{
				"items": []bson.M{
					{"$sort": bson.M{"created_at": -1}},
					{"$skip": skip},
					{"$limit": limit},
					{"$project": bson.M{
						"_id":             1,
						"user_id":         1,
						"user_email":      "$user.email",
						"subscription_id": 1,
						"plan_id":         1,
						"plan_name":       "$plan.name",
						"amount":          1,
						"currency":        1,
						"status":          1,
						"payment_method":  1,
						"transaction_id":  1,
						"card_last4":      1,
						"created_at":      1,
						"updated_at":      1,
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

		cursor, err := paymentCollection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
			return
		}
		defer cursor.Close(ctx)

		var results []facetResult
		if err := cursor.All(ctx, &results); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode payments"})
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

		for i := range items {
			if oid, ok := items[i]["_id"].(bson.ObjectID); ok {
				items[i]["_id"] = oid.Hex()
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

// AdminRevenueAnalytics returns revenue grouped by day/week/month for SUCCESS payments.
func AdminRevenueAnalytics(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		granularityParam := c.Query("granularity")
		fromStr := c.Query("from")
		toStr := c.Query("to")

		granularity, ok := normalizeGranularity(granularityParam)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid granularity"})
			return
		}

		paymentCollection := database.OpenCollection("payments", client)

		and := []bson.M{{"status": "SUCCESS"}}

		createdAtFilter, err := buildTimeRangeFilter("created_at", fromStr, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date range"})
			return
		}
		if len(createdAtFilter) > 0 {
			and = append(and, createdAtFilter)
		}

		pipeline := []bson.M{
			{"$match": bson.M{"$and": and}},
			{"$group": bson.M{
				"_id":   periodKeyExpr("$created_at", granularity),
				"amount": bson.M{"$sum": "$amount"},
			}},
			{"$sort": bson.M{"_id": 1}},
		}

		type aggRow struct {
			Period string  `bson:"_id"`
			Amount float64 `bson:"amount"`
		}

		cursor, err := paymentCollection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate revenue"})
			return
		}
		defer cursor.Close(ctx)

		var rows []aggRow
		if err := cursor.All(ctx, &rows); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode revenue analytics"})
			return
		}

		series := make([]gin.H, 0, len(rows))
		total := 0.0
		for _, r := range rows {
			series = append(series, gin.H{
				"period_start": r.Period,
				"amount":       r.Amount,
			})
			total += r.Amount
		}

		c.JSON(http.StatusOK, gin.H{
			"currency": "USD",
			"series":   series,
			"total":    total,
		})
	}
}

// AdminSubscriptionTrendsAnalytics returns new/canceled subscription counts grouped by day/week/month.
func AdminSubscriptionTrendsAnalytics(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		granularityParam := c.Query("granularity")
		fromStr := c.Query("from")
		toStr := c.Query("to")

		granularity, ok := normalizeGranularity(granularityParam)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid granularity"})
			return
		}

		subscriptionCollection := database.OpenCollection("subscriptions", client)

		createdAtFilter, err := buildTimeRangeFilter("created_at", fromStr, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date range"})
			return
		}
		updatedAtFilter, err := buildTimeRangeFilter("updated_at", fromStr, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date range"})
			return
		}

		type aggRow struct {
			Period string `bson:"_id"`
			Count  int64  `bson:"count"`
		}

		// New subscriptions by created_at
		newPipeline := []bson.M{}
		if len(createdAtFilter) > 0 {
			newPipeline = append(newPipeline, bson.M{"$match": createdAtFilter})
		}
		newPipeline = append(newPipeline,
			bson.M{"$group": bson.M{
				"_id":   periodKeyExpr("$created_at", granularity),
				"count": bson.M{"$sum": 1},
			}},
		)

		newCursor, err := subscriptionCollection.Aggregate(ctx, newPipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate subscription trends"})
			return
		}
		var newRows []aggRow
		if err := newCursor.All(ctx, &newRows); err != nil {
			newCursor.Close(ctx)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode subscription trends"})
			return
		}
		newCursor.Close(ctx)

		// Canceled subscriptions by updated_at where status == CANCELED
		cancelPipeline := []bson.M{
			{"$match": bson.M{"status": "CANCELED"}},
		}
		if len(updatedAtFilter) > 0 {
			// updatedAtFilter is {"updated_at": {...}}
			cancelPipeline = append(cancelPipeline, bson.M{"$match": updatedAtFilter})
		}
		cancelPipeline = append(cancelPipeline,
			bson.M{"$group": bson.M{
				"_id":   periodKeyExpr("$updated_at", granularity),
				"count": bson.M{"$sum": 1},
			}},
		)

		cancelCursor, err := subscriptionCollection.Aggregate(ctx, cancelPipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate subscription trends"})
			return
		}
		var cancelRows []aggRow
		if err := cancelCursor.All(ctx, &cancelRows); err != nil {
			cancelCursor.Close(ctx)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode subscription trends"})
			return
		}
		cancelCursor.Close(ctx)

		// Merge rows into a single series
		type trendPoint struct {
			New      int64
			Canceled int64
		}
		merged := map[string]*trendPoint{}

		for _, r := range newRows {
			p, exists := merged[r.Period]
			if !exists {
				p = &trendPoint{}
				merged[r.Period] = p
			}
			p.New = r.Count
		}
		for _, r := range cancelRows {
			p, exists := merged[r.Period]
			if !exists {
				p = &trendPoint{}
				merged[r.Period] = p
			}
			p.Canceled = r.Count
		}

		// Sort keys (period strings)
		keys := make([]string, 0, len(merged))
		for k := range merged {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		series := make([]gin.H, 0, len(keys))
		for _, k := range keys {
			p := merged[k]
			series = append(series, gin.H{
				"period_start":          k,
				"new_subscriptions":     p.New,
				"canceled_subscriptions": p.Canceled,
			})
		}

		c.JSON(http.StatusOK, gin.H{"series": series})
	}
}

// AdminPopularPlansAnalytics returns most popular plans by subscription count in range, with revenue per plan.
func AdminPopularPlansAnalytics(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		fromStr := c.Query("from")
		toStr := c.Query("to")
		limitStr := c.Query("limit")

		var limit int64 = 5
		if limitStr != "" {
			if parsed, err := strconv.ParseInt(limitStr, 10, 64); err == nil && parsed > 0 {
				limit = parsed
			}
		}
		if limit > 50 {
			limit = 50
		}

		subscriptionCollection := database.OpenCollection("subscriptions", client)
		paymentCollection := database.OpenCollection("payments", client)

		createdAtFilter, err := buildTimeRangeFilter("created_at", fromStr, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date range"})
			return
		}

		// Subscriptions per plan (created in range)
		subPipeline := []bson.M{}
		if len(createdAtFilter) > 0 {
			subPipeline = append(subPipeline, bson.M{"$match": createdAtFilter})
		}
		subPipeline = append(subPipeline,
			bson.M{"$group": bson.M{
				"_id":           "$plan_id",
				"subscriptions": bson.M{"$sum": 1},
			}},
			bson.M{"$sort": bson.M{"subscriptions": -1}},
			bson.M{"$limit": limit},
			bson.M{"$lookup": bson.M{
				"from":         "plans",
				"localField":   "_id",
				"foreignField": "plan_id",
				"as":           "plan",
			}},
			bson.M{"$unwind": bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}},
			bson.M{"$project": bson.M{
				"_id":           0,
				"plan_id":       "$_id",
				"plan_name":     "$plan.name",
				"subscriptions": 1,
			}},
		)

		type planCountRow struct {
			PlanID       string `bson:"plan_id"`
			PlanName     string `bson:"plan_name"`
			Subscriptions int64 `bson:"subscriptions"`
		}

		subCursor, err := subscriptionCollection.Aggregate(ctx, subPipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate popular plans"})
			return
		}
		defer subCursor.Close(ctx)

		var planCounts []planCountRow
		if err := subCursor.All(ctx, &planCounts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode popular plans"})
			return
		}

		// Revenue per plan from successful payments in range
		paymentAnd := []bson.M{{"status": "SUCCESS"}}
		paymentCreatedAtFilter, err := buildTimeRangeFilter("created_at", fromStr, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date range"})
			return
		}
		if len(paymentCreatedAtFilter) > 0 {
			paymentAnd = append(paymentAnd, paymentCreatedAtFilter)
		}

		revenuePipeline := []bson.M{
			{"$match": bson.M{"$and": paymentAnd}},
			{"$group": bson.M{
				"_id":     "$plan_id",
				"revenue": bson.M{"$sum": "$amount"},
			}},
		}

		type revenueRow struct {
			PlanID  string  `bson:"_id"`
			Revenue float64 `bson:"revenue"`
		}

		revCursor, err := paymentCollection.Aggregate(ctx, revenuePipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate plan revenue"})
			return
		}
		defer revCursor.Close(ctx)

		var revenues []revenueRow
		if err := revCursor.All(ctx, &revenues); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode plan revenue"})
			return
		}

		revenueMap := map[string]float64{}
		for _, r := range revenues {
			revenueMap[r.PlanID] = r.Revenue
		}

		items := make([]gin.H, 0, len(planCounts))
		for _, p := range planCounts {
			items = append(items, gin.H{
				"plan_id":       p.PlanID,
				"plan_name":     p.PlanName,
				"subscriptions": p.Subscriptions,
				"revenue":       revenueMap[p.PlanID],
			})
		}

		c.JSON(http.StatusOK, gin.H{"items": items})
	}
}



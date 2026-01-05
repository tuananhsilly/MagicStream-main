package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/database"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/models"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// GetMe returns canonical server-side user profile
func GetMe(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		userCollection := database.OpenCollection("users", client)
		var user models.User
		err = userCollection.FindOne(ctx, bson.D{{Key: "user_id", Value: userID}}).Decode(&user)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user profile"})
			return
		}

		// Get subscription info
		subscriptionCollection := database.OpenCollection("subscriptions", client)
		var subscription models.Subscription
		subFilter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "status", Value: "ACTIVE"},
		}
		err = subscriptionCollection.FindOne(ctx, subFilter).Decode(&subscription)
		
		var subscriptionInfo map[string]interface{}
		if err == nil && subscription.ExpiresAt.After(time.Now()) {
			// Get plan details
			planCollection := database.OpenCollection("plans", client)
			var plan models.Plan
			planErr := planCollection.FindOne(ctx, bson.D{{Key: "plan_id", Value: subscription.PlanID}}).Decode(&plan)
			if planErr == nil {
				subscriptionInfo = map[string]interface{}{
					"plan_id":    subscription.PlanID,
					"plan_name":  plan.Name,
					"status":     subscription.Status,
					"expires_at": subscription.ExpiresAt,
					"can_stream": true,
				}
			} else {
				subscriptionInfo = map[string]interface{}{
					"plan_id":    subscription.PlanID,
					"status":     subscription.Status,
					"expires_at": subscription.ExpiresAt,
					"can_stream": true,
				}
			}
		} else {
			subscriptionInfo = map[string]interface{}{
				"can_stream": false,
			}
		}

		// Get user ratings count (optional, for display)
		ratingCollection := database.OpenCollection("ratings", client)
		ratingCount, _ := ratingCollection.CountDocuments(ctx, bson.D{{Key: "user_id", Value: userID}})

		response := map[string]interface{}{
			"user_id":          user.UserID,
			"first_name":       user.FirstName,
			"last_name":        user.LastName,
			"email":            user.Email,
			"role":             user.Role,
			"favourite_genres": user.FavouriteGenres,
			"email_verified":   user.EmailVerified,
			"subscription":     subscriptionInfo,
			"ratings_count":    ratingCount,
		}

		c.JSON(http.StatusOK, response)
	}
}

// UpdatePreferences updates user's favourite genres
func UpdatePreferences(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		var req struct {
			FavouriteGenres []models.Genre `json:"favourite_genres" validate:"dive"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		// Accept empty list (user can clear preferences)
		userCollection := database.OpenCollection("users", client)
		update := bson.M{
			"$set": bson.M{
				"favourite_genres": req.FavouriteGenres,
				"update_at":        time.Now(),
			},
		}

		filter := bson.D{{Key: "user_id", Value: userID}}
		result, err := userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":           "Preferences updated successfully",
			"favourite_genres": req.FavouriteGenres,
		})
	}
}


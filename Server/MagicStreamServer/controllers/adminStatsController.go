package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/database"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// GetAdminStats returns high-level admin dashboard statistics.
// Route should be protected by Auth middleware + RequireAdmin middleware.
func GetAdminStats(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		now := time.Now()

		movieCollection := database.OpenCollection("movies", client)
		userCollection := database.OpenCollection("users", client)
		subscriptionCollection := database.OpenCollection("subscriptions", client)
		ratingCollection := database.OpenCollection("ratings", client)
		watchlistCollection := database.OpenCollection("watchlists", client)
		paymentCollection := database.OpenCollection("payments", client)

		totalMovies, err := movieCollection.CountDocuments(ctx, bson.D{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count movies"})
			return
		}

		totalUsers, err := userCollection.CountDocuments(ctx, bson.D{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count users"})
			return
		}

		activeSubscriptionFilter := bson.D{
			{Key: "expires_at", Value: bson.D{{Key: "$gt", Value: now}}},
			{Key: "status", Value: bson.D{{Key: "$in", Value: []string{"ACTIVE", "CANCELED"}}}},
		}
		activeSubscriptions, err := subscriptionCollection.CountDocuments(ctx, activeSubscriptionFilter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count active subscriptions"})
			return
		}

		totalRatings, err := ratingCollection.CountDocuments(ctx, bson.D{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count ratings"})
			return
		}

		totalWatchlistItems, err := watchlistCollection.CountDocuments(ctx, bson.D{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count watchlist items"})
			return
		}

		// Revenue (all-time): sum of successful payments
		type revenueAggResult struct {
			Amount float64 `bson:"amount"`
		}

		revenueAmount := 0.0
		pipeline := []bson.M{
			{"$match": bson.M{"status": "SUCCESS"}},
			{"$group": bson.M{"_id": nil, "amount": bson.M{"$sum": "$amount"}}},
		}

		cursor, err := paymentCollection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate revenue"})
			return
		}
		defer cursor.Close(ctx)

		if cursor.Next(ctx) {
			var res revenueAggResult
			if err := cursor.Decode(&res); err == nil {
				revenueAmount = res.Amount
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"total_movies":          totalMovies,
			"total_users":           totalUsers,
			"active_subscriptions":  activeSubscriptions,
			"total_ratings":         totalRatings,
			"total_watchlist_items": totalWatchlistItems,
			"revenue": gin.H{
				"amount":   revenueAmount,
				"currency": "USD",
			},
			"generated_at": time.Now().UTC().Format(time.RFC3339),
		})
	}
}



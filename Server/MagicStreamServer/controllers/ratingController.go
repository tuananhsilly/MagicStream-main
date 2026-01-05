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
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// UpsertRating creates or updates user's rating for a movie
func UpsertRating(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		imdbID := c.Param("imdb_id")
		if imdbID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required"})
			return
		}

		// Verify movie exists
		movieCollection := database.OpenCollection("movies", client)
		var movie models.Movie
		err = movieCollection.FindOne(ctx, bson.D{{Key: "imdb_id", Value: imdbID}}).Decode(&movie)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify movie"})
			return
		}

		var req struct {
			Rating     int    `json:"rating" validate:"required,min=1,max=5"`
			ReviewText string `json:"review_text,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		ratingCollection := database.OpenCollection("ratings", client)
		filter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "imdb_id", Value: imdbID},
		}

		// Check if rating exists
		var existingRating models.Rating
		err = ratingCollection.FindOne(ctx, filter).Decode(&existingRating)
		
		now := time.Now()
		if err == nil {
			// Update existing
			update := bson.M{
				"$set": bson.M{
					"rating":      req.Rating,
					"review_text": req.ReviewText,
					"updated_at":  now,
				},
			}
			_, err = ratingCollection.UpdateOne(ctx, filter, update)
		} else if err == mongo.ErrNoDocuments {
			// Insert new
			rating := models.Rating{
				UserID:     userID,
				ImdbID:     imdbID,
				Rating:     req.Rating,
				ReviewText: req.ReviewText,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			_, err = ratingCollection.InsertOne(ctx, rating)
		}
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save rating"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":    "Rating saved successfully",
			"rating":     req.Rating,
			"review_text": req.ReviewText,
		})
	}
}

// GetMovieRatings returns aggregate ratings and recent reviews for a movie
func GetMovieRatings(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		imdbID := c.Param("imdb_id")
		if imdbID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required"})
			return
		}

		ratingCollection := database.OpenCollection("ratings", client)
		filter := bson.D{{Key: "imdb_id", Value: imdbID}}

		// Get aggregate stats
		pipeline := []bson.M{
			{"$match": bson.M{"imdb_id": imdbID}},
			{"$group": bson.M{
				"_id":   nil,
				"avg":   bson.M{"$avg": "$rating"},
				"count": bson.M{"$sum": 1},
			}},
		}

		cursor, err := ratingCollection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate ratings"})
			return
		}
		defer cursor.Close(ctx)

		var avg float64
		var count int64

		if cursor.Next(ctx) {
			var result bson.M
			if err = cursor.Decode(&result); err == nil {
				if avgVal, ok := result["avg"].(float64); ok {
					avg = avgVal
				}
				if countVal, ok := result["count"].(int64); ok {
					count = countVal
				}
			}
		}

		// Get recent reviews (last 10, sorted by created_at desc)
		findOptions := options.Find().
			SetSort(bson.D{{Key: "created_at", Value: -1}}).
			SetLimit(10)

		reviewCursor, err := ratingCollection.Find(ctx, filter, findOptions)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
			return
		}
		defer reviewCursor.Close(ctx)

		var recent []models.Rating
		if err = reviewCursor.All(ctx, &recent); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"})
			return
		}

		// Remove user_id from response for privacy (or keep it if you want to show usernames)
		for i := range recent {
			recent[i].UserID = "" // Clear user_id for privacy
		}

		response := models.RatingAggregate{
			Avg:    avg,
			Count:  count,
			Recent: recent,
		}

		c.JSON(http.StatusOK, response)
	}
}

// GetUserRatings returns all ratings by current user with movie details
func GetUserRatings(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		ratingCollection := database.OpenCollection("ratings", client)

		// Aggregation pipeline to join with movies collection
		pipeline := []bson.M{
			{"$match": bson.M{"user_id": userID}},
			{"$sort": bson.M{"updated_at": -1}},
			{"$lookup": bson.M{
				"from":         "movies",
				"localField":   "imdb_id",
				"foreignField": "imdb_id",
				"as":           "movie",
			}},
			{"$unwind": bson.M{
				"path":                       "$movie",
				"preserveNullAndEmptyArrays": true,
			}},
			{"$project": bson.M{
				"_id":          1,
				"user_id":      1,
				"imdb_id":      1,
				"rating":       1,
				"review_text":  1,
				"created_at":   1,
				"updated_at":   1,
				"movie_title":  "$movie.title",
				"movie_poster": "$movie.poster_path",
			}},
		}

		cursor, err := ratingCollection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ratings"})
			return
		}
		defer cursor.Close(ctx)

		var results []bson.M
		if err = cursor.All(ctx, &results); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode ratings"})
			return
		}

		// Return empty array instead of null
		if results == nil {
			results = []bson.M{}
		}

		c.JSON(http.StatusOK, results)
	}
}

// DeleteRating removes user's rating for a movie
func DeleteRating(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		imdbID := c.Param("imdb_id")
		if imdbID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required"})
			return
		}

		ratingCollection := database.OpenCollection("ratings", client)
		filter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "imdb_id", Value: imdbID},
		}

		result, err := ratingCollection.DeleteOne(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete rating"})
			return
		}

		if result.DeletedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Rating not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Rating deleted successfully"})
	}
}


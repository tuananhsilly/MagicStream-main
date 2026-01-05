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

// AddToMyList adds a movie to user's watchlist
func AddToMyList(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		// Get user ID from context (set by auth middleware)
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

		// Check if already in watchlist
		watchlistCollection := database.OpenCollection("watchlists", client)
		filter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "imdb_id", Value: imdbID},
		}

		var existingWatchlist models.Watchlist
		err = watchlistCollection.FindOne(ctx, filter).Decode(&existingWatchlist)
		if err == nil {
			// Already exists
			c.JSON(http.StatusOK, gin.H{"message": "Movie already in your list"})
			return
		}
		if err != mongo.ErrNoDocuments {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check watchlist"})
			return
		}

		// Add to watchlist
		watchlist := models.Watchlist{
			ID:        bson.NewObjectID(),
			UserID:    userID,
			ImdbID:    imdbID,
			CreatedAt: time.Now(),
		}

		_, err = watchlistCollection.InsertOne(ctx, watchlist)
		if err != nil {
			// Check if duplicate key error (unique constraint violation)
			if mongo.IsDuplicateKeyError(err) {
				c.JSON(http.StatusOK, gin.H{"message": "Movie already in your list"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add movie to list"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Movie added to your list"})
	}
}

// RemoveFromMyList removes a movie from user's watchlist
func RemoveFromMyList(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		// Get user ID from context
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

		watchlistCollection := database.OpenCollection("watchlists", client)
		filter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "imdb_id", Value: imdbID},
		}

		result, err := watchlistCollection.DeleteOne(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove movie from list"})
			return
		}

		if result.DeletedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found in your list"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Movie removed from your list"})
	}
}

// GetMyList returns all movies in user's watchlist
func GetMyList(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		// Get user ID from context
		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		watchlistCollection := database.OpenCollection("watchlists", client)
		movieCollection := database.OpenCollection("movies", client)

		// Find all watchlist entries for user
		filter := bson.D{{Key: "user_id", Value: userID}}
		findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

		cursor, err := watchlistCollection.Find(ctx, filter, findOptions)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch watchlist"})
			return
		}
		defer cursor.Close(ctx)

		var watchlistItems []models.Watchlist
		if err = cursor.All(ctx, &watchlistItems); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode watchlist"})
			return
		}

		// Extract imdb_ids
		imdbIDs := make([]string, 0, len(watchlistItems))
		for _, item := range watchlistItems {
			imdbIDs = append(imdbIDs, item.ImdbID)
		}

		if len(imdbIDs) == 0 {
			c.JSON(http.StatusOK, []models.Movie{})
			return
		}

		// Fetch full movie details
		movieFilter := bson.D{{Key: "imdb_id", Value: bson.D{{Key: "$in", Value: imdbIDs}}}}
		movieCursor, err := movieCollection.Find(ctx, movieFilter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch movies"})
			return
		}
		defer movieCursor.Close(ctx)

		var movies []models.Movie
		if err = movieCursor.All(ctx, &movies); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode movies"})
			return
		}

		// Sort movies to match watchlist order (most recently added first)
		movieMap := make(map[string]models.Movie)
		for _, movie := range movies {
			movieMap[movie.ImdbID] = movie
		}

		sortedMovies := make([]models.Movie, 0, len(imdbIDs))
		for _, imdbID := range imdbIDs {
			if movie, exists := movieMap[imdbID]; exists {
				sortedMovies = append(sortedMovies, movie)
			}
		}

		c.JSON(http.StatusOK, sortedMovies)
	}
}


package controllers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
	"github.com/tmc/langchaingo/llms/openai"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/database"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/models"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/utils"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var validate = validator.New()

// Rate limiter for OpenAI review ranking calls (5 requests per minute per user)
var reviewRankingLimiter = utils.NewRateLimiter(5, time.Minute)

func GetMovies(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		// Parse query parameters
		query := c.Query("q")
		genreIDStr := c.Query("genre_id")
		rankingMaxStr := c.Query("ranking_max")
		sortParam := c.Query("sort")
		limitStr := c.Query("limit")
		pageStr := c.Query("page")

		// Check if pagination params were explicitly provided
		hasPaginationParams := limitStr != "" || pageStr != ""

		// Set defaults if not provided
		if limitStr == "" {
			limitStr = "20"
		}
		if pageStr == "" {
			pageStr = "1"
		}

		// Parse limit (default 20, allow larger exports up to 500; "all" fetches everything)
		var limit int64
		if strings.EqualFold(limitStr, "all") {
			limit = 0 // 0 means no limit in Mongo
		} else {
			parsedLimit, err := strconv.ParseInt(limitStr, 10, 64)
			if err != nil || parsedLimit < 1 {
				parsedLimit = 20
		}
			if parsedLimit > 500 {
				parsedLimit = 500
			}
			limit = parsedLimit
		}

		// Parse page (default 1)
		page, err := strconv.ParseInt(pageStr, 10, 64)
		if err != nil || page < 1 {
			page = 1
		}

		// Build filter
		filter := bson.D{}

		// Title search (case-insensitive regex)
		if query != "" {
			// Escape special regex characters
			escapedQuery := strings.ReplaceAll(strings.ReplaceAll(query, "\\", "\\\\"), ".", "\\.")
			filter = append(filter, bson.E{
				Key: "title",
				Value: bson.D{
					{Key: "$regex", Value: escapedQuery},
					{Key: "$options", Value: "i"},
				},
			})
		}

		// Genre filter (by genre_id)
		if genreIDStr != "" {
			genreID, err := strconv.Atoi(genreIDStr)
			if err == nil {
				filter = append(filter, bson.E{
					Key:   "genre.genre_id",
					Value: genreID,
				})
			}
		}

		// Ranking filter (ranking_value <= ranking_max)
		if rankingMaxStr != "" {
			rankingMax, err := strconv.Atoi(rankingMaxStr)
			if err == nil && rankingMax > 0 {
				filter = append(filter, bson.E{
					Key: "ranking.ranking_value",
					Value: bson.D{
						{Key: "$lte", Value: rankingMax},
					},
				})
			}
		}

		// Build sort options
		findOptions := options.Find()
		switch sortParam {
		case "top_ranked":
			// Best ranking first (lower ranking_value = better)
			findOptions.SetSort(bson.D{{Key: "ranking.ranking_value", Value: 1}})
		case "az":
			// Title A-Z (case-insensitive)
			findOptions.SetSort(bson.D{{Key: "title", Value: 1}})
		case "za":
			// Title Z-A (case-insensitive)
			findOptions.SetSort(bson.D{{Key: "title", Value: -1}})
		default:
			// Default: no sort (or maintain existing behavior)
		}

		// Pagination
		if limit > 0 {
		skip := (page - 1) * limit
		findOptions.SetSkip(skip)
		findOptions.SetLimit(limit)
		}

		// Count total matching documents for pagination
		total, err := movieCollection.CountDocuments(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count movies."})
			return
		}

		// Find movies
		cursor, err := movieCollection.Find(ctx, filter, findOptions)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch movies."})
			return
		}
		defer cursor.Close(ctx)

		var movies []models.Movie
		if err = cursor.All(ctx, &movies); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode movies."})
			return
		}

		// Calculate total pages
		totalPages := int64(1)
		if limit > 0 {
			totalPages = (total + limit - 1) / limit
		}

		// Backward compatibility: if no params provided, return array directly
		hasParams := query != "" || genreIDStr != "" || rankingMaxStr != "" || sortParam != "" || hasPaginationParams
		if !hasParams {
			c.JSON(http.StatusOK, movies)
			return
		}

		// Return paginated response
		c.JSON(http.StatusOK, gin.H{
			"items":      movies,
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		})
	}
}

func GetMovie(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		movieID := c.Param("imdb_id")

		if movieID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required"})
			return
		}

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		var movie models.Movie

		err := movieCollection.FindOne(ctx, bson.D{{Key: "imdb_id", Value: movieID}}).Decode(&movie)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		c.JSON(http.StatusOK, movie)

	}
}

func AddMovie(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movie models.Movie
		if err := c.ShouldBindJSON(&movie); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		if err := validate.Struct(movie); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
			return
		}
		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		result, err := movieCollection.InsertOne(ctx, movie)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add movie"})
			return
		}

		c.JSON(http.StatusCreated, result)

	}
}

func UpdateMovie(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 100*time.Second)
		defer cancel()

		movieID := c.Param("imdb_id")
		if movieID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie ID is required"})
			return
		}

		// Define update struct with optional fields
		var updateData struct {
			Title       *string         `json:"title"`
			PosterPath  *string         `json:"poster_path"`
			YouTubeID   *string         `json:"youtube_id"`
			Genre       *[]models.Genre `json:"genre"`
			AdminReview *string         `json:"admin_review"`
			Ranking     *models.Ranking `json:"ranking"`
		}

		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		movieCollection := database.OpenCollection("movies", client)

		// Check if movie exists
		var existingMovie models.Movie
		err := movieCollection.FindOne(ctx, bson.D{{Key: "imdb_id", Value: movieID}}).Decode(&existingMovie)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch movie"})
			return
		}

		// Build update document with only provided fields
		update := bson.M{"$set": bson.M{}}

		if updateData.Title != nil {
			if len(*updateData.Title) < 2 || len(*updateData.Title) > 500 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Title must be between 2 and 500 characters"})
				return
			}
			update["$set"].(bson.M)["title"] = *updateData.Title
		}

		if updateData.PosterPath != nil {
			if len(*updateData.PosterPath) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Poster path cannot be empty"})
				return
			}
			update["$set"].(bson.M)["poster_path"] = *updateData.PosterPath
		}

		if updateData.YouTubeID != nil {
			if len(*updateData.YouTubeID) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "YouTube ID cannot be empty"})
				return
			}
			update["$set"].(bson.M)["youtube_id"] = *updateData.YouTubeID
		}

		if updateData.Genre != nil {
			if len(*updateData.Genre) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "At least one genre is required"})
				return
			}
			update["$set"].(bson.M)["genre"] = *updateData.Genre
		}

		if updateData.AdminReview != nil {
			update["$set"].(bson.M)["admin_review"] = *updateData.AdminReview
		}

		if updateData.Ranking != nil {
			// Validate ranking
			if updateData.Ranking.RankingValue < 1 || updateData.Ranking.RankingValue > 5 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Ranking value must be between 1 and 5"})
				return
			}
			update["$set"].(bson.M)["ranking"] = *updateData.Ranking
		}

		// Only update if there are fields to update
		if len(update["$set"].(bson.M)) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No fields provided to update"})
			return
		}

		filter := bson.D{{Key: "imdb_id", Value: movieID}}
		result, err := movieCollection.UpdateOne(ctx, filter, update)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update movie"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		// Fetch and return updated movie
		var updatedMovie models.Movie
		err = movieCollection.FindOne(ctx, filter).Decode(&updatedMovie)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"message": "Movie updated successfully", "matched_count": result.MatchedCount})
			return
		}

		c.JSON(http.StatusOK, updatedMovie)
	}
}

func AdminReviewUpdate(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Role check is now handled by RequireAdmin middleware, but keep for extra safety
		userId, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
			return
		}

		// Rate limiting: check if user has exceeded limit
		if !reviewRankingLimiter.Allow(userId) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please wait before submitting another review ranking update.",
			})
			return
		}

		movieId := c.Param("imdb_id")
		if movieId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Movie Id required"})
			return
		}
		var req struct {
			AdminReview string `json:"admin_review"`
		}
		var resp struct {
			RankingName string `json:"ranking_name"`
			AdminReview string `json:"admin_review"`
		}

		if err := c.ShouldBind(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
		
		// Get review ranking with timeout and error handling
		sentiment, rankVal, err := GetReviewRanking(req.AdminReview, client, c)
		if err != nil {
			log.Printf("Error getting review ranking: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to process review ranking. Please try again later.",
			})
			return
		}

		filter := bson.D{{Key: "imdb_id", Value: movieId}}

		update := bson.M{
			"$set": bson.M{
				"admin_review": req.AdminReview,
				"ranking": bson.M{
					"ranking_value": rankVal,
					"ranking_name":  sentiment,
				},
			},
		}
		var ctx, cancel = context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		result, err := movieCollection.UpdateOne(ctx, filter, update)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating movie"})
			return
		}

		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}
		resp.RankingName = sentiment
		resp.AdminReview = req.AdminReview

		c.JSON(http.StatusOK, resp)

	}
}

func GetReviewRanking(admin_review string, client *mongo.Client, c *gin.Context) (string, int, error) {
	rankings, err := GetRankings(client, c)

	if err != nil {
		return "", 0, err
	}

	sentimentDelimited := ""

	for _, ranking := range rankings {
		if ranking.RankingValue != 999 {
			sentimentDelimited = sentimentDelimited + ranking.RankingName + ","
		}
	}

	sentimentDelimited = strings.Trim(sentimentDelimited, ",")

	err = godotenv.Load(".env")

	if err != nil {
		log.Println("Warning: .env file not found")
	}

	OpenAiApiKey := os.Getenv("OPENAI_API_KEY")

	if OpenAiApiKey == "" {
		return "", 0, errors.New("OPENAI_API_KEY not configured")
	}

	llm, err := openai.New(openai.WithToken(OpenAiApiKey))

	if err != nil {
		return "", 0, errors.New("failed to initialize OpenAI client")
	}

	base_prompt_template := os.Getenv("BASE_PROMPT_TEMPLATE")
	if base_prompt_template == "" {
		return "", 0, errors.New("BASE_PROMPT_TEMPLATE not configured")
	}

	base_prompt := strings.Replace(base_prompt_template, "{rankings}", sentimentDelimited, 1)

	// Create context with timeout for OpenAI call (30 seconds)
	ctx, cancel := context.WithTimeout(c, 30*time.Second)
	defer cancel()

	response, err := llm.Call(ctx, base_prompt+admin_review)

	if err != nil {
		// Check if timeout occurred
		if ctx.Err() == context.DeadlineExceeded {
			return "", 0, errors.New("OpenAI request timed out")
		}
		return "", 0, errors.New("OpenAI API error: " + err.Error())
	}

	// Normalize response: trim whitespace and handle case-insensitive matching
	response = strings.TrimSpace(response)
	rankVal := 0

	// Try exact match first
	for _, ranking := range rankings {
		if strings.EqualFold(ranking.RankingName, response) {
			rankVal = ranking.RankingValue
			return ranking.RankingName, rankVal, nil // Return normalized name
		}
	}

	// If no exact match, try partial match (in case OpenAI returns something like "Excellent!" or "Excellent movie")
	for _, ranking := range rankings {
		if strings.Contains(strings.ToLower(response), strings.ToLower(ranking.RankingName)) {
			rankVal = ranking.RankingValue
			return ranking.RankingName, rankVal, nil
		}
	}

	// Fallback: if no match found, return "Okay" (middle ranking)
	log.Printf("Warning: OpenAI returned unknown ranking '%s', defaulting to 'Okay'", response)
	for _, ranking := range rankings {
		if ranking.RankingValue == 3 { // Default to "Okay"
			return ranking.RankingName, ranking.RankingValue, nil
		}
	}

	// Last resort: return first valid ranking
	if len(rankings) > 0 {
		for _, ranking := range rankings {
			if ranking.RankingValue != 999 {
				return ranking.RankingName, ranking.RankingValue, nil
			}
		}
	}

	return "", 0, errors.New("no valid ranking found")
}

func GetRankings(client *mongo.Client, c *gin.Context) ([]models.Ranking, error) {
	var rankings []models.Ranking

	var ctx, cancel = context.WithTimeout(c, 100*time.Second)
	defer cancel()

	var rankingCollection *mongo.Collection = database.OpenCollection("rankings", client)

	cursor, err := rankingCollection.Find(ctx, bson.D{})

	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &rankings); err != nil {
		return nil, err
	}

	return rankings, nil

}

func GetRecommendedMovies(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userId, err := utils.GetUserIdFromContext(c)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User Id not found in context"})
		}

		favouriteGenreIds, err := GetUsersFavouriteGenreIds(userId, client, c)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// If user has no favourite genres, return empty array
		if len(favouriteGenreIds) == 0 {
			c.JSON(http.StatusOK, []models.Movie{})
			return
		}

		err = godotenv.Load(".env")
		if err != nil {
			log.Println("Warning: .env file not found")
		}
		var recommendedMovieLimitVal int64 = 5

		recommendedMovieLimitStr := os.Getenv("RECOMMENDED_MOVIE_LIMIT")

		if recommendedMovieLimitStr != "" {
			recommendedMovieLimitVal, _ = strconv.ParseInt(recommendedMovieLimitStr, 10, 64)
		}

		findOptions := options.Find()

		findOptions.SetSort(bson.D{{Key: "ranking.ranking_value", Value: 1}})

		findOptions.SetLimit(recommendedMovieLimitVal)

		// Filter by genre_id instead of genre_name to avoid naming mismatches
		filter := bson.D{
			{Key: "genre.genre_id", Value: bson.D{
				{Key: "$in", Value: favouriteGenreIds},
			}},
		}

		var ctx, cancel = context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var movieCollection *mongo.Collection = database.OpenCollection("movies", client)

		cursor, err := movieCollection.Find(ctx, filter, findOptions)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching recommended movies"})
			return
		}
		defer cursor.Close(ctx)

		var recommendedMovies []models.Movie

		if err := cursor.All(ctx, &recommendedMovies); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, recommendedMovies)
	}
}

// GetUsersFavouriteGenreIds returns user's favourite genre IDs (for recommendation matching)
func GetUsersFavouriteGenreIds(userId string, client *mongo.Client, c *gin.Context) ([]int, error) {
	var ctx, cancel = context.WithTimeout(c, 100*time.Second)
	defer cancel()

	filter := bson.D{{Key: "user_id", Value: userId}}

	projection := bson.M{
		"favourite_genres.genre_id": 1,
		"_id":                       0,
	}

	opts := options.FindOne().SetProjection(projection)
	var result bson.M

	var userCollection *mongo.Collection = database.OpenCollection("users", client)
	err := userCollection.FindOne(ctx, filter, opts).Decode(&result)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return []int{}, nil
		}
		return []int{}, err
	}

	favGenresArray, ok := result["favourite_genres"].(bson.A)

	if !ok {
		return []int{}, errors.New("unable to retrieve favourite genres for user")
	}

	var genreIds []int

	for _, item := range favGenresArray {
		if genreMap, ok := item.(bson.D); ok {
			for _, elem := range genreMap {
				if elem.Key == "genre_id" {
					// Handle both int32 and int64 from MongoDB
					switch v := elem.Value.(type) {
					case int:
						genreIds = append(genreIds, v)
					case int32:
						genreIds = append(genreIds, int(v))
					case int64:
						genreIds = append(genreIds, int(v))
					}
				}
			}
		}
	}

	return genreIds, nil
}

// GetUsersFavouriteGenres (deprecated - kept for backward compatibility if needed)
// Returns user's favourite genre names
func GetUsersFavouriteGenres(userId string, client *mongo.Client, c *gin.Context) ([]string, error) {
	var ctx, cancel = context.WithTimeout(c, 100*time.Second)
	defer cancel()

	filter := bson.D{{Key: "user_id", Value: userId}}

	projection := bson.M{
		"favourite_genres.genre_name": 1,
		"_id":                         0,
	}

	opts := options.FindOne().SetProjection(projection)
	var result bson.M

	var userCollection *mongo.Collection = database.OpenCollection("users", client)
	err := userCollection.FindOne(ctx, filter, opts).Decode(&result)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return []string{}, nil
		}
		return []string{}, err
	}

	favGenresArray, ok := result["favourite_genres"].(bson.A)

	if !ok {
		return []string{}, errors.New("unable to retrieve favourite genres for user")
	}

	var genreNames []string

	for _, item := range favGenresArray {
		if genreMap, ok := item.(bson.D); ok {
			for _, elem := range genreMap {
				if elem.Key == "genre_name" {
					if name, ok := elem.Value.(string); ok {
						genreNames = append(genreNames, name)
					}
				}
			}
		}
	}

	return genreNames, nil
}

func GetGenres(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(c, 100*time.Second)
		defer cancel()

		var genreCollection *mongo.Collection = database.OpenCollection("genres", client)

		cursor, err := genreCollection.Find(ctx, bson.D{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching movie genres"})
			return
		}
		defer cursor.Close(ctx)

		var genres []models.Genre
		if err := cursor.All(ctx, &genres); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, genres)

	}
}

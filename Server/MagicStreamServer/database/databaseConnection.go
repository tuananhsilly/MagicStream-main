package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func Connect() *mongo.Client {

	err := godotenv.Load(".env")

	if err != nil {
		log.Println("Warning: unable to fund .env file")
	}

	MongoDb := os.Getenv("MONGODB_URI")

	if MongoDb == "" {
		log.Fatal("MONGODB_URI not set!")
	}

	fmt.Println("MongoDB URI: ", MongoDb)

	clientOptions := options.Client().ApplyURI(MongoDb)

	client, err := mongo.Connect(clientOptions)

	if err != nil {
		return nil
	}

	return client
}

//var Client *mongo.Client = DBInstance()

func OpenCollection(collectionName string, client *mongo.Client) *mongo.Collection {

	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")

	fmt.Println("DATABASE_NAME: ", databaseName)

	collection := client.Database(databaseName).Collection(collectionName)

	if collection == nil {
		return nil
	}
	return collection

}

// CreateMovieIndexes creates indexes for the movies collection to optimize search, filter, and sort queries
func CreateMovieIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	movieCollection := client.Database(databaseName).Collection("movies")

	// Index for title search (case-insensitive)
	titleIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "title", Value: 1}},
		Options: options.Index().SetName("title_idx"),
	}

	// Compound index for genre filter + ranking sort
	genreRankingIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "genre.genre_id", Value: 1},
			{Key: "ranking.ranking_value", Value: 1},
		},
		Options: options.Index().SetName("genre_ranking_idx"),
	}

	// Index for ranking filter
	rankingIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "ranking.ranking_value", Value: 1}},
		Options: options.Index().SetName("ranking_idx"),
	}

	indexes := []mongo.IndexModel{titleIndexModel, genreRankingIndexModel, rankingIndexModel}

	_, err = movieCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some indexes (may already exist): %v", err)
		// Don't fail completely - indexes may already exist
		return nil
	}

	log.Println("Movie indexes created successfully")
	return nil
}

// CreateWatchlistIndexes creates indexes for the watchlists collection
func CreateWatchlistIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	watchlistCollection := client.Database(databaseName).Collection("watchlists")

	// Unique compound index: user_id + imdb_id (prevents duplicates)
	uniqueIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "imdb_id", Value: 1},
		},
		Options: options.Index().
			SetName("user_imdb_unique_idx").
			SetUnique(true),
	}

	// Index for listing user's watchlist (sorted by created_at desc)
	listIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().SetName("user_created_at_idx"),
	}

	indexes := []mongo.IndexModel{uniqueIndexModel, listIndexModel}

	_, err = watchlistCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some watchlist indexes (may already exist): %v", err)
		// Don't fail completely - indexes may already exist
		return nil
	}

	log.Println("Watchlist indexes created successfully")
	return nil
}

// CreatePlanIndexes creates indexes for the plans collection
func CreatePlanIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	planCollection := client.Database(databaseName).Collection("plans")

	// Unique index on plan_id
	uniqueIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "plan_id", Value: 1}},
		Options: options.Index().SetName("plan_id_unique_idx").SetUnique(true),
	}

	indexes := []mongo.IndexModel{uniqueIndexModel}

	_, err = planCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some plan indexes (may already exist): %v", err)
		return nil
	}

	log.Println("Plan indexes created successfully")
	return nil
}

// CreateSubscriptionIndexes creates indexes for the subscriptions collection
func CreateSubscriptionIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	subscriptionCollection := client.Database(databaseName).Collection("subscriptions")

	// Index for finding active subscriptions by user
	userStatusIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "status", Value: 1},
		},
		Options: options.Index().SetName("user_status_idx"),
	}

	// Index for expiry checks
	expiresIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetName("expires_at_idx"),
	}

	indexes := []mongo.IndexModel{userStatusIndexModel, expiresIndexModel}

	_, err = subscriptionCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some subscription indexes (may already exist): %v", err)
		return nil
	}

	log.Println("Subscription indexes created successfully")
	return nil
}

// CreateRatingIndexes creates indexes for the ratings collection
func CreateRatingIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	ratingCollection := client.Database(databaseName).Collection("ratings")

	// Unique compound index: user_id + imdb_id (prevents duplicates)
	uniqueIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "imdb_id", Value: 1},
		},
		Options: options.Index().
			SetName("user_imdb_unique_idx").
			SetUnique(true),
	}

	// Index for movie ratings queries
	movieIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "imdb_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().SetName("imdb_created_at_idx"),
	}

	indexes := []mongo.IndexModel{uniqueIndexModel, movieIndexModel}

	_, err = ratingCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some rating indexes (may already exist): %v", err)
		return nil
	}

	log.Println("Rating indexes created successfully")
	return nil
}

// CreatePasswordResetIndexes creates indexes for the password_resets collection
func CreatePasswordResetIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	passwordResetCollection := client.Database(databaseName).Collection("password_resets")

	// Unique index on token
	tokenIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "token", Value: 1}},
		Options: options.Index().SetName("token_unique_idx").SetUnique(true),
	}

	// Index for expiry cleanup
	expiresIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetName("expires_at_idx"),
	}

	// Index for user lookups
	userIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetName("user_id_idx"),
	}

	indexes := []mongo.IndexModel{tokenIndexModel, expiresIndexModel, userIndexModel}

	_, err = passwordResetCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some password reset indexes (may already exist): %v", err)
		return nil
	}

	log.Println("Password reset indexes created successfully")
	return nil
}

// CreatePaymentIndexes creates indexes for the payments collection
func CreatePaymentIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	paymentCollection := client.Database(databaseName).Collection("payments")

	// Index for user payment history
	userPaymentIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().SetName("user_created_at_idx"),
	}

	// Unique index on transaction_id
	transactionIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "transaction_id", Value: 1}},
		Options: options.Index().SetName("transaction_id_unique_idx").SetUnique(true),
	}

	// Index for subscription lookups
	subscriptionIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "subscription_id", Value: 1}},
		Options: options.Index().SetName("subscription_id_idx"),
	}

	indexes := []mongo.IndexModel{userPaymentIndexModel, transactionIndexModel, subscriptionIndexModel}

	_, err = paymentCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some payment indexes (may already exist): %v", err)
		return nil
	}

	log.Println("Payment indexes created successfully")
	return nil
}

// CreateEmailVerificationIndexes creates indexes for the email_verifications collection
func CreateEmailVerificationIndexes(client *mongo.Client) error {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	databaseName := os.Getenv("DATABASE_NAME")
	if databaseName == "" {
		return fmt.Errorf("DATABASE_NAME not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	emailVerificationCollection := client.Database(databaseName).Collection("email_verifications")

	// Unique index on token
	tokenIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "token", Value: 1}},
		Options: options.Index().SetName("token_unique_idx").SetUnique(true),
	}

	// Index for expiry cleanup
	expiresIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetName("expires_at_idx"),
	}

	// Index for user lookups
	userIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetName("user_id_idx"),
	}

	indexes := []mongo.IndexModel{tokenIndexModel, expiresIndexModel, userIndexModel}

	_, err = emailVerificationCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create some email verification indexes (may already exist): %v", err)
		return nil
	}

	log.Println("Email verification indexes created successfully")
	return nil
}

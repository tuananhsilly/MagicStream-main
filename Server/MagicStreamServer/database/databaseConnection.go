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

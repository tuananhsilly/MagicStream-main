package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/database"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/routes"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func main() {
	// This is the main function

	router := gin.Default()

	router.GET("/hello", func(c *gin.Context) {
		c.String(200, "Hello, MagicStreamMovies!")
	})

	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: unable to find .env file")
	}

	// CORS origins: configurable via env, with safe defaults for local + deployed frontends
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")

	// Default allow-list covers localhost + known deployments (vercel + render)
	defaultOrigins := []string{
		"http://localhost:5173",
		"http://localhost:4173",
		"http://localhost:3000",
		"https://magic-stream-main.vercel.app",
		"https://magicstream-main.vercel.app",
		"https://magic-stream-main.onrender.com",
		"https://magicstream-main.onrender.com",
	}

	var origins []string
	if allowedOrigins != "" {
		origins = strings.Split(allowedOrigins, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
	} else {
		origins = defaultOrigins
	}
	for _, o := range origins {
		log.Println("Allowed Origin:", o)
	}

	config := cors.Config{}
	config.AllowOrigins = origins
	config.AllowMethods = []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour

	router.Use(cors.New(config))
	router.Use(gin.Logger())

	var client *mongo.Client = database.Connect()

	if err := client.Ping(context.Background(), nil); err != nil {
		log.Fatalf("Failed to reach server: %v", err)
	}
	defer func() {
		err := client.Disconnect(context.Background())
		if err != nil {
			log.Fatalf("Failed to disconnect from MongoDB: %v", err)
		}

	}()

	// Create indexes for movies collection
	if err := database.CreateMovieIndexes(client); err != nil {
		log.Printf("Warning: Failed to create movie indexes: %v", err)
	}

	// Create indexes for watchlists collection
	if err := database.CreateWatchlistIndexes(client); err != nil {
		log.Printf("Warning: Failed to create watchlist indexes: %v", err)
	}

	// Create indexes for plans collection
	if err := database.CreatePlanIndexes(client); err != nil {
		log.Printf("Warning: Failed to create plan indexes: %v", err)
	}

	// Create indexes for subscriptions collection
	if err := database.CreateSubscriptionIndexes(client); err != nil {
		log.Printf("Warning: Failed to create subscription indexes: %v", err)
	}

	// Create indexes for ratings collection
	if err := database.CreateRatingIndexes(client); err != nil {
		log.Printf("Warning: Failed to create rating indexes: %v", err)
	}

	// Create indexes for password_resets collection
	if err := database.CreatePasswordResetIndexes(client); err != nil {
		log.Printf("Warning: Failed to create password reset indexes: %v", err)
	}

	// Create indexes for email_verifications collection
	if err := database.CreateEmailVerificationIndexes(client); err != nil {
		log.Printf("Warning: Failed to create email verification indexes: %v", err)
	}

	// Create indexes for payments collection
	if err := database.CreatePaymentIndexes(client); err != nil {
		log.Printf("Warning: Failed to create payment indexes: %v", err)
	}

	routes.SetupUnProtectedRoutes(router, client)
	routes.SetupProtectedRoutes(router, client)

	if err := router.Run(":8080"); err != nil {
		fmt.Println("Failed to start server", err)
	}

}

package routes

import (
	controller "github.com/GavinLonDigital/MagicStream/Server/MagicStreamServer/controllers"
	"github.com/GavinLonDigital/MagicStream/Server/MagicStreamServer/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func SetupProtectedRoutes(router *gin.Engine, client *mongo.Client) {
	router.Use(middleware.AuthMiddleWare())

	router.GET("/movie/:imdb_id", controller.GetMovie(client))
	router.GET("/recommendedmovies", controller.GetRecommendedMovies(client))
	
	// Admin-only routes
	adminRoutes := router.Group("")
	adminRoutes.Use(middleware.RequireAdmin())
	{
		adminRoutes.POST("/addmovie", controller.AddMovie(client))
		adminRoutes.PATCH("/updatereview/:imdb_id", controller.AdminReviewUpdate(client))
		adminRoutes.PATCH("/movie/:imdb_id", controller.UpdateMovie(client))
	}
}

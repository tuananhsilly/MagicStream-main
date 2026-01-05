package routes

import (
	controller "github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/controllers"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func SetupUnProtectedRoutes(router *gin.Engine, client *mongo.Client) {

	router.GET("/movies", controller.GetMovies(client))
	router.POST("/register", controller.RegisterUser(client))
	router.POST("/login", controller.LoginUser(client))
	router.POST("/logout", controller.LogoutHandler(client))
	router.GET("/genres", controller.GetGenres(client))
	router.POST("/refresh", controller.RefreshTokenHandler(client))
	
	// Public rating endpoint
	router.GET("/movies/:imdb_id/ratings", controller.GetMovieRatings(client))
	
	// Password reset routes (unprotected - user not logged in)
	router.POST("/forgot-password", controller.ForgotPassword(client))
	router.POST("/reset-password", controller.ResetPassword(client))
}

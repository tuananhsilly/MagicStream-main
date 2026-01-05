package routes

import (
	"github.com/gin-gonic/gin"
	controller "github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/controllers"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/middleware"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func SetupProtectedRoutes(router *gin.Engine, client *mongo.Client) {
	router.Use(middleware.AuthMiddleWare())

	router.GET("/movie/:imdb_id", controller.GetMovie(client))
	router.GET("/recommendedmovies", controller.GetRecommendedMovies(client))

	// My List (watchlist) routes
	router.POST("/mylist/:imdb_id", controller.AddToMyList(client))
	router.DELETE("/mylist/:imdb_id", controller.RemoveFromMyList(client))
	router.GET("/mylist", controller.GetMyList(client))

	// Account/profile routes
	router.GET("/me", controller.GetMe(client))
	router.PUT("/me/preferences", controller.UpdatePreferences(client))

	// Subscription routes
	router.GET("/plans", controller.GetPlans(client))
	router.POST("/subscribe", controller.Subscribe(client))
	router.GET("/subscription", controller.GetSubscription(client))
	router.POST("/subscription/cancel", controller.CancelSubscription(client))
	router.GET("/payments", controller.GetPaymentHistory(client))

	// Rating routes
	router.PUT("/ratings/:imdb_id", controller.UpsertRating(client))
	router.GET("/me/ratings", controller.GetUserRatings(client))
	router.DELETE("/ratings/:imdb_id", controller.DeleteRating(client))

	// Email verification routes (protected - user must be logged in to request)
	router.POST("/verify-email/request", controller.RequestEmailVerification(client))
	router.POST("/verify-email/confirm", controller.ConfirmEmailVerification(client))

	// Admin-only routes
	adminRoutes := router.Group("")
	adminRoutes.Use(middleware.RequireAdmin())
	{
		adminRoutes.GET("/admin/stats", controller.GetAdminStats(client))
		adminRoutes.GET("/admin/users", controller.AdminListUsers(client))
		adminRoutes.GET("/admin/users/:user_id", controller.AdminGetUser(client))
		adminRoutes.PATCH("/admin/users/:user_id/role", controller.AdminUpdateUserRole(client))
		adminRoutes.GET("/admin/subscriptions", controller.AdminListSubscriptions(client))
		adminRoutes.PATCH("/admin/subscriptions/:id/cancel", controller.AdminCancelSubscription(client))
		adminRoutes.PATCH("/admin/subscriptions/:id/activate", controller.AdminActivateSubscription(client))
		adminRoutes.GET("/admin/payments", controller.AdminListPayments(client))
		adminRoutes.GET("/admin/analytics/revenue", controller.AdminRevenueAnalytics(client))
		adminRoutes.GET("/admin/analytics/subscriptions", controller.AdminSubscriptionTrendsAnalytics(client))
		adminRoutes.GET("/admin/analytics/plans/popular", controller.AdminPopularPlansAnalytics(client))
		adminRoutes.POST("/addmovie", controller.AddMovie(client))
		adminRoutes.PATCH("/updatereview/:imdb_id", controller.AdminReviewUpdate(client))
		adminRoutes.PATCH("/movie/:imdb_id", controller.UpdateMovie(client))
	}
}

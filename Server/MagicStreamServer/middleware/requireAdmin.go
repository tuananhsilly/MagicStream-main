package middleware

import (
	"net/http"

	"github.com/GavinLonDigital/MagicStream/Server/MagicStreamServer/utils"
	"github.com/gin-gonic/gin"
)

// RequireAdmin is a middleware that ensures the user has ADMIN role
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, err := utils.GetRoleFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Role not found in context"})
			c.Abort()
			return
		}

		if role != "ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}


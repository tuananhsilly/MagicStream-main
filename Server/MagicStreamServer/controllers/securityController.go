package controllers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/database"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/models"
	"github.com/tuananhsilly/MagicStream-main/Server/MagicStreamServer/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// generateToken generates a random token for password reset/email verification
func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// ForgotPassword handles password reset request (SIMULATION - returns token in response)
func ForgotPassword(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		var req struct {
			Email string `json:"email" validate:"required,email"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		// Find user by email
		userCollection := database.OpenCollection("users", client)
		var user models.User
		err := userCollection.FindOne(ctx, bson.D{{Key: "email", Value: req.Email}}).Decode(&user)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				// Don't reveal if email exists (security best practice)
				c.JSON(http.StatusOK, gin.H{
					"message": "If the email exists, a reset token has been generated",
					"token":   "", // Empty for non-existent emails
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
			return
		}

		// Generate token
		token, err := generateToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		// Store reset token
		passwordResetCollection := database.OpenCollection("password_resets", client)
		reset := models.PasswordReset{
			Email:     req.Email,
			UserID:    user.UserID,
			Token:     token,
			ExpiresAt: time.Now().Add(1 * time.Hour), // 1 hour expiry
			CreatedAt: time.Now(),
		}

		_, err = passwordResetCollection.InsertOne(ctx, reset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reset token"})
			return
		}

		// SIMULATION: Return token in response (in production, send via email)
		c.JSON(http.StatusOK, gin.H{
			"message": "Password reset token generated (SIMULATION)",
			"token":   token,
			"expires_at": reset.ExpiresAt,
		})
	}
}

// ResetPassword validates token and updates password
func ResetPassword(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		var req struct {
			Token       string `json:"token" validate:"required"`
			NewPassword string `json:"new_password" validate:"required,min=6"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		// Find valid reset token
		passwordResetCollection := database.OpenCollection("password_resets", client)
		filter := bson.D{
			{Key: "token", Value: req.Token},
			{Key: "expires_at", Value: bson.D{{Key: "$gt", Value: time.Now()}}},
			{Key: "used_at", Value: bson.D{{Key: "$exists", Value: false}}},
		}

		var reset models.PasswordReset
		err := passwordResetCollection.FindOne(ctx, filter).Decode(&reset)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired token"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate token"})
			return
		}

		// Hash new password
		hashedPassword, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		// Update user password
		userCollection := database.OpenCollection("users", client)
		update := bson.M{
			"$set": bson.M{
				"password":   hashedPassword,
				"update_at": time.Now(),
			},
		}

		_, err = userCollection.UpdateOne(ctx, bson.D{{Key: "user_id", Value: reset.UserID}}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
			return
		}

		// Mark token as used
		now := time.Now()
		passwordResetCollection.UpdateOne(ctx, bson.D{{Key: "_id", Value: reset.ID}}, bson.M{
			"$set": bson.M{"used_at": now},
		})

		c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
	}
}

// RequestEmailVerification generates verification token (SIMULATION)
func RequestEmailVerification(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		// Check if already verified
		userCollection := database.OpenCollection("users", client)
		var user models.User
		err = userCollection.FindOne(ctx, bson.D{{Key: "user_id", Value: userID}}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		if user.EmailVerified {
			c.JSON(http.StatusOK, gin.H{"message": "Email already verified"})
			return
		}

		// Generate token
		token, err := generateToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		// Store verification token
		emailVerificationCollection := database.OpenCollection("email_verifications", client)
		verification := models.EmailVerification{
			UserID:    userID,
			Token:     token,
			ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hour expiry
			CreatedAt: time.Now(),
		}

		_, err = emailVerificationCollection.InsertOne(ctx, verification)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create verification token"})
			return
		}

		// SIMULATION: Return token in response
		c.JSON(http.StatusOK, gin.H{
			"message":    "Email verification token generated (SIMULATION)",
			"token":      token,
			"expires_at": verification.ExpiresAt,
		})
	}
}

// ConfirmEmailVerification validates token and marks email as verified
func ConfirmEmailVerification(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		var req struct {
			Token string `json:"token" validate:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		// Find valid verification token
		emailVerificationCollection := database.OpenCollection("email_verifications", client)
		filter := bson.D{
			{Key: "token", Value: req.Token},
			{Key: "expires_at", Value: bson.D{{Key: "$gt", Value: time.Now()}}},
			{Key: "used_at", Value: bson.D{{Key: "$exists", Value: false}}},
		}

		var verification models.EmailVerification
		err := emailVerificationCollection.FindOne(ctx, filter).Decode(&verification)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired token"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate token"})
			return
		}

		// Update user email_verified
		userCollection := database.OpenCollection("users", client)
		update := bson.M{
			"$set": bson.M{
				"email_verified": true,
				"update_at":      time.Now(),
			},
		}

		_, err = userCollection.UpdateOne(ctx, bson.D{{Key: "user_id", Value: verification.UserID}}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify email"})
			return
		}

		// Mark token as used
		now := time.Now()
		emailVerificationCollection.UpdateOne(ctx, bson.D{{Key: "_id", Value: verification.ID}}, bson.M{
			"$set": bson.M{"used_at": now},
		})

		c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
	}
}


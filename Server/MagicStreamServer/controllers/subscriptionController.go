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
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// generateTransactionID generates a random transaction ID for simulated payments
func generateTransactionID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return "txn_" + hex.EncodeToString(bytes)
}

// GetPlans returns all available subscription plans
func GetPlans(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		planCollection := database.OpenCollection("plans", client)
		findOptions := options.Find().SetSort(bson.D{{Key: "price_monthly", Value: 1}})

		cursor, err := planCollection.Find(ctx, bson.D{}, findOptions)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plans"})
			return
		}
		defer cursor.Close(ctx)

		var plans []models.Plan
		if err = cursor.All(ctx, &plans); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode plans"})
			return
		}

		if len(plans) == 0 {
			c.JSON(http.StatusOK, []models.Plan{})
			return
		}

		c.JSON(http.StatusOK, plans)
	}
}

// GetSubscription returns the current user's subscription details with plan info
func GetSubscription(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		subscriptionCollection := database.OpenCollection("subscriptions", client)
		planCollection := database.OpenCollection("plans", client)
		paymentCollection := database.OpenCollection("payments", client)

		// Find active subscription
		filter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "status", Value: bson.D{{Key: "$in", Value: []string{"ACTIVE", "CANCELED"}}}},
		}

		var subscription models.Subscription
		err = subscriptionCollection.FindOne(ctx, filter, options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})).Decode(&subscription)

		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusOK, gin.H{
					"subscription": nil,
					"can_stream":   false,
					"payments":     []models.Payment{},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscription"})
			return
		}

		// Get plan details
		var plan models.Plan
		planCollection.FindOne(ctx, bson.D{{Key: "plan_id", Value: subscription.PlanID}}).Decode(&plan)

		// Check if can stream (ACTIVE and not expired)
		canStream := subscription.Status == "ACTIVE" && subscription.ExpiresAt.After(time.Now())

		// Get payment history
		paymentFilter := bson.D{{Key: "user_id", Value: userID}}
		paymentOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(10)
		cursor, _ := paymentCollection.Find(ctx, paymentFilter, paymentOpts)
		var payments []models.Payment
		if cursor != nil {
			cursor.All(ctx, &payments)
			cursor.Close(ctx)
		}

		response := models.SubscriptionWithPlan{
			Subscription: subscription,
			Plan:         &plan,
			CanStream:    canStream,
		}

		c.JSON(http.StatusOK, gin.H{
			"subscription": response,
			"can_stream":   canStream,
			"payments":     payments,
		})
	}
}

// Subscribe creates or updates active subscription for current user with payment simulation
func Subscribe(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		var req struct {
			PlanID        string `json:"plan_id" binding:"required"`
			PaymentMethod string `json:"payment_method"` // "CARD" or "PAYPAL"
			CardNumber    string `json:"card_number"`    // For simulation - last 4 digits stored
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		// Default payment method
		if req.PaymentMethod == "" {
			req.PaymentMethod = "CARD"
		}

		// Verify plan exists
		planCollection := database.OpenCollection("plans", client)
		var plan models.Plan
		err = planCollection.FindOne(ctx, bson.D{{Key: "plan_id", Value: req.PlanID}}).Decode(&plan)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify plan"})
			return
		}

		subscriptionCollection := database.OpenCollection("subscriptions", client)
		paymentCollection := database.OpenCollection("payments", client)

		// Create payment record (PENDING)
		transactionID := generateTransactionID()
		cardLast4 := ""
		if len(req.CardNumber) >= 4 {
			cardLast4 = req.CardNumber[len(req.CardNumber)-4:]
		}

		payment := models.Payment{
			UserID:        userID,
			PlanID:        req.PlanID,
			Amount:        plan.PriceMonthly,
			Currency:      "USD",
			Status:        "PENDING",
			PaymentMethod: req.PaymentMethod,
			TransactionID: transactionID,
			CardLast4:     cardLast4,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		paymentResult, err := paymentCollection.InsertOne(ctx, payment)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
			return
		}

		// Simulate payment processing (instant success for simulation)
		// In real world, this would be async with webhook
		payment.Status = "SUCCESS"
		payment.UpdatedAt = time.Now()
		paymentCollection.UpdateOne(ctx, bson.D{{Key: "_id", Value: paymentResult.InsertedID}}, bson.M{
			"$set": bson.M{
				"status":     "SUCCESS",
				"updated_at": time.Now(),
			},
		})

		// Cancel any existing active subscriptions
		filter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "status", Value: "ACTIVE"},
		}
		update := bson.M{
			"$set": bson.M{
				"status":     "CANCELED",
				"updated_at": time.Now(),
			},
		}
		subscriptionCollection.UpdateMany(ctx, filter, update)

		// Create new subscription
		now := time.Now()
		expiresAt := now.AddDate(0, 1, 0)      // 1 month
		nextBillingAt := now.AddDate(0, 1, 0)  // Same as expiry for monthly

		subscription := models.Subscription{
			UserID:        userID,
			PlanID:        req.PlanID,
			Status:        "ACTIVE",
			StartedAt:     now,
			ExpiresAt:     expiresAt,
			NextBillingAt: nextBillingAt,
			PaymentMethod: req.PaymentMethod,
			AutoRenew:     true,
			CreatedAt:     now,
			UpdatedAt:     now,
		}

		subResult, err := subscriptionCollection.InsertOne(ctx, subscription)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscription"})
			return
		}

		// Update payment with subscription ID
		paymentCollection.UpdateOne(ctx, bson.D{{Key: "_id", Value: paymentResult.InsertedID}}, bson.M{
			"$set": bson.M{
				"subscription_id": subResult.InsertedID.(bson.ObjectID).Hex(),
			},
		})

		c.JSON(http.StatusCreated, gin.H{
			"message":        "Subscription activated successfully",
			"subscription": gin.H{
				"plan_id":         req.PlanID,
				"plan_name":       plan.Name,
				"status":          "ACTIVE",
				"started_at":      now,
				"expires_at":      expiresAt,
				"next_billing_at": nextBillingAt,
				"auto_renew":      true,
			},
			"payment": gin.H{
				"transaction_id": transactionID,
				"amount":         plan.PriceMonthly,
				"currency":       "USD",
				"status":         "SUCCESS",
				"payment_method": req.PaymentMethod,
			},
			"can_stream": true,
		})
	}
}

// CancelSubscription cancels auto-renewal for active subscription
func CancelSubscription(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		subscriptionCollection := database.OpenCollection("subscriptions", client)

		// Find active subscription
		filter := bson.D{
			{Key: "user_id", Value: userID},
			{Key: "status", Value: "ACTIVE"},
		}

		var subscription models.Subscription
		err = subscriptionCollection.FindOne(ctx, filter).Decode(&subscription)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "No active subscription found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscription"})
			return
		}

		// Update subscription - set auto_renew to false, keep ACTIVE until expiry
		update := bson.M{
			"$set": bson.M{
				"auto_renew": false,
				"status":     "CANCELED",
				"updated_at": time.Now(),
			},
		}

		_, err = subscriptionCollection.UpdateOne(ctx, bson.D{{Key: "_id", Value: subscription.ID}}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel subscription"})
			return
		}

		// Can still stream until expiry
		canStream := subscription.ExpiresAt.After(time.Now())

		c.JSON(http.StatusOK, gin.H{
			"message":    "Subscription cancelled. You can continue streaming until " + subscription.ExpiresAt.Format("January 2, 2006"),
			"expires_at": subscription.ExpiresAt,
			"can_stream": canStream,
		})
	}
}

// GetPaymentHistory returns payment history for current user
func GetPaymentHistory(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 30*time.Second)
		defer cancel()

		userID, err := utils.GetUserIdFromContext(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		paymentCollection := database.OpenCollection("payments", client)

		filter := bson.D{{Key: "user_id", Value: userID}}
		findOptions := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(20)

		cursor, err := paymentCollection.Find(ctx, filter, findOptions)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
			return
		}
		defer cursor.Close(ctx)

		var payments []models.Payment
		if err = cursor.All(ctx, &payments); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode payments"})
			return
		}

		c.JSON(http.StatusOK, payments)
	}
}

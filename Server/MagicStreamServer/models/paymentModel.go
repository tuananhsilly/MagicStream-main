package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Payment struct {
	ID             bson.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	UserID         string        `bson:"user_id" json:"user_id" validate:"required"`
	SubscriptionID string        `bson:"subscription_id" json:"subscription_id"`
	PlanID         string        `bson:"plan_id" json:"plan_id" validate:"required"`
	Amount         float64       `bson:"amount" json:"amount" validate:"required"`
	Currency       string        `bson:"currency" json:"currency"` // "USD"
	Status         string        `bson:"status" json:"status" validate:"required,oneof=PENDING SUCCESS FAILED REFUNDED"`
	PaymentMethod  string        `bson:"payment_method" json:"payment_method"`
	TransactionID  string        `bson:"transaction_id" json:"transaction_id"` // Generated fake ID
	CardLast4      string        `bson:"card_last4,omitempty" json:"card_last4,omitempty"`
	CreatedAt      time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time     `bson:"updated_at" json:"updated_at"`
}


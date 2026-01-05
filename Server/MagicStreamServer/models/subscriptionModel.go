package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Subscription struct {
	ID            bson.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	UserID        string        `bson:"user_id" json:"user_id" validate:"required"`
	PlanID        string        `bson:"plan_id" json:"plan_id" validate:"required"`
	Status        string        `bson:"status" json:"status" validate:"required,oneof=ACTIVE CANCELED EXPIRED PENDING"`
	StartedAt     time.Time     `bson:"started_at" json:"started_at"`
	ExpiresAt     time.Time     `bson:"expires_at" json:"expires_at"`
	NextBillingAt time.Time     `bson:"next_billing_at" json:"next_billing_at"`
	PaymentMethod string        `bson:"payment_method" json:"payment_method"` // "CARD", "PAYPAL" (simulated)
	AutoRenew     bool          `bson:"auto_renew" json:"auto_renew"`
	CreatedAt     time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time     `bson:"updated_at" json:"updated_at"`
}

// SubscriptionWithPlan is a combined structure for API responses
type SubscriptionWithPlan struct {
	Subscription
	Plan      *Plan  `json:"plan,omitempty"`
	CanStream bool   `json:"can_stream"`
}


package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Plan struct {
	ID           bson.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	PlanID       string        `bson:"plan_id" json:"plan_id" validate:"required"`
	Name         string        `bson:"name" json:"name" validate:"required"`
	PriceMonthly float64       `bson:"price_monthly" json:"price_monthly" validate:"required,min=0"`
	MaxStreams   int           `bson:"max_streams" json:"max_streams" validate:"required,min=1"`
	MaxQuality   string        `bson:"max_quality" json:"max_quality" validate:"required"` // "720p", "1080p", "4K"
	Features     []string      `bson:"features" json:"features"`                           // e.g., ["HD", "No Ads", "Downloads"]
	IsPopular    bool          `bson:"is_popular" json:"is_popular"`                       // highlight badge
	CreatedAt    time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time     `bson:"updated_at" json:"updated_at"`
}


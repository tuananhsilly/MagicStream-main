package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Rating struct {
	ID         bson.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	UserID     string        `bson:"user_id" json:"user_id" validate:"required"`
	ImdbID     string        `bson:"imdb_id" json:"imdb_id" validate:"required"`
	Rating     int           `bson:"rating" json:"rating" validate:"required,min=1,max=5"`
	ReviewText string        `bson:"review_text,omitempty" json:"review_text,omitempty"`
	CreatedAt  time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time     `bson:"updated_at" json:"updated_at"`
}

type RatingAggregate struct {
	Avg    float64  `json:"avg"`
	Count  int64    `json:"count"`
	Recent []Rating `json:"recent"`
}


package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Watchlist struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	UserID    string        `bson:"user_id" json:"user_id" validate:"required"`
	ImdbID    string        `bson:"imdb_id" json:"imdb_id" validate:"required"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}


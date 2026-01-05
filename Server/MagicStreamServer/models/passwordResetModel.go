package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type PasswordReset struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Email     string        `bson:"email" json:"email" validate:"required,email"`
	UserID    string        `bson:"user_id" json:"user_id" validate:"required"`
	Token     string        `bson:"token" json:"token" validate:"required"`
	ExpiresAt time.Time     `bson:"expires_at" json:"expires_at"`
	UsedAt    *time.Time    `bson:"used_at,omitempty" json:"used_at,omitempty"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}


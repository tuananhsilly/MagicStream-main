package utils

import (
	"sync"
	"time"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	mu          sync.Mutex
	requests    map[string][]time.Time
	maxRequests int
	window      time.Duration
}

// NewRateLimiter creates a new rate limiter
// maxRequests: maximum number of requests allowed
// window: time window in which maxRequests are allowed
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests:    make(map[string][]time.Time),
		maxRequests: maxRequests,
		window:      window,
	}
}

// Allow checks if a request is allowed for the given key
// Returns true if allowed, false if rate limit exceeded
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Clean up old requests outside the window
	if timestamps, exists := rl.requests[key]; exists {
		validTimestamps := []time.Time{}
		for _, ts := range timestamps {
			if ts.After(cutoff) {
				validTimestamps = append(validTimestamps, ts)
			}
		}
		rl.requests[key] = validTimestamps
	}

	// Check if limit exceeded
	if len(rl.requests[key]) >= rl.maxRequests {
		return false
	}

	// Add current request
	rl.requests[key] = append(rl.requests[key], now)
	return true
}

// Reset clears all rate limit data (useful for testing)
func (rl *RateLimiter) Reset() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.requests = make(map[string][]time.Time)
}


# 🎬 MagicStream

<div align="center">

![MagicStream Logo](Client/magic-stream-client/src/assets/MagicStreamLogo.png)

**A modern, full-stack movie streaming platform with subscription-based access**

[![React](https://img.shields.io/badge/React-19.1.0-61dafb?logo=react)](https://reactjs.org/)
[![Go](https://img.shields.io/badge/Go-1.24.2-00ADD8?logo=go)](https://golang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-6.4.1-646CFF?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Usage Guide](#-usage-guide)
- [Security](#-security)
- [Development Notes](#-development-notes)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

MagicStream is a comprehensive movie streaming platform that combines a modern React frontend with a high-performance Go backend. The platform features subscription-based access control, user authentication, personalized watchlists, ratings and reviews, and a complete admin dashboard for content management.

### Key Highlights

- 🔐 **Secure Authentication** - JWT-based auth with role-based access control
- 💳 **Subscription System** - Multi-tier plans (Basic, Standard, Premium)
- 🎥 **Video Streaming** - Integrated video player with quality options
- ⭐ **Ratings & Reviews** - Community-driven movie ratings
- 📝 **Personal Watchlist** - Save and manage your favorite movies
- 👑 **Admin Dashboard** - Complete content and user management
- 🎨 **Modern UI** - Glassmorphism design with responsive layout

---

## ✨ Features

### User Features

#### 🔑 Authentication & Authorization
- User registration and login with JWT tokens
- HTTP-only cookie-based session management
- Email verification system (simulated for development)
- Password reset functionality with secure tokens
- Role-based access control (USER, ADMIN)

#### 🎬 Movie Catalog
- Browse extensive movie collection
- Advanced filtering by genre, ranking, and search
- Detailed movie information with trailers
- YouTube trailer integration via React Player
- Genre-based recommendation system

#### 📺 Streaming & Subscriptions
- **Three subscription tiers:**
  - Basic Plan ($9.99/month) - HD quality, 1 stream
  - Standard Plan ($14.99/month) - Full HD quality, 2 streams
  - Premium Plan ($19.99/month) - 4K quality, 4 streams
- Paywall system - active subscription required to stream
- Subscription management in user account
- Browse catalog freely (streaming requires subscription)

#### 📝 Watchlist (My List)
- Add/remove movies to personal watchlist
- Persistent storage per user
- Real-time UI updates with optimistic rendering
- Quick toggle from any movie card

#### ⭐ Ratings & Reviews
- 5-star rating system
- Written reviews for movies
- Aggregate ratings display
- View your rating history in account page

#### 👤 Account Management
Unified account page with five sections:
- **Profile** - Personal information and subscription status
- **Preferences** - Favorite genres for personalized recommendations
- **Subscription** - View and manage subscription plans
- **Ratings** - History of your movie ratings
- **Security** - Email verification and password reset

### Admin Features

#### 👑 Admin Dashboard
- **User Management**
  - View all registered users
  - Edit user details
  - Delete user accounts
  - Monitor user activity
  
- **Movie Management**
  - Add new movies to catalog
  - Edit movie details (title, poster, trailer, genres, admin review)
  - Delete movies from catalog
  - Manage movie rankings
  
- **Subscription Analytics**
  - View active subscriptions
  - Monitor subscription distribution
  - Track revenue metrics
  
- **Review Moderation**
  - View all user reviews
  - Monitor ratings across the platform
  - Moderate inappropriate content

---

## 🛠 Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.0 | UI framework |
| **Vite** | 6.4.1 | Build tool and dev server |
| **React Router DOM** | 7.6.2 | Client-side routing |
| **React Bootstrap** | 2.10.10 | UI components |
| **Bootstrap** | 5.3.6 | CSS framework |
| **FontAwesome** | 6.7.2+ | Icon library |
| **React Player** | 2.16.0 | Video streaming |
| **Axios** | 1.9.0 | HTTP client |
| **ESLint** | 9.25.0 | Code linting |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Go** | 1.24.2 | Backend language |
| **Gin** | 1.10.1 | Web framework |
| **MongoDB Driver** | 2.2.2 | Database client |
| **JWT** | 5.2.2 | Authentication tokens |
| **bcrypt** | Latest | Password hashing |
| **Validator** | 10.26.0 | Input validation |
| **CORS** | 1.7.6 | Cross-origin resource sharing |
| **godotenv** | 1.5.1 | Environment configuration |

### Database

- **MongoDB** - NoSQL database for flexible schema
- **Collections**: users, movies, watchlists, plans, subscriptions, ratings, password_resets, email_verifications

---

## 📁 Project Structure

```
MagicStream-main/
├── Client/
│   └── magic-stream-client/
│       ├── src/
│       │   ├── api/                    # Axios configuration
│       │   │   ├── axiosConfig.js
│       │   │   └── axiosPrivateConfig.js
│       │   ├── components/
│       │   │   ├── account/            # Account management
│       │   │   ├── admin/              # Admin dashboard
│       │   │   ├── filterBar/          # Movie filtering
│       │   │   ├── header/             # Navigation header
│       │   │   ├── home/               # Homepage
│       │   │   ├── login/              # Login page
│       │   │   ├── register/           # Registration page
│       │   │   ├── movie/              # Movie cards
│       │   │   ├── movies/             # Movie listing
│       │   │   ├── myList/             # Watchlist page
│       │   │   ├── recommended/        # Recommendations
│       │   │   ├── review/             # Review components
│       │   │   ├── searchBar/          # Search functionality
│       │   │   ├── stream/             # Video streaming
│       │   │   ├── subscription/       # Subscription management
│       │   │   └── spinner/            # Loading states
│       │   ├── context/
│       │   │   ├── AuthProvider.jsx    # Auth context
│       │   │   └── WatchlistProvider.jsx # Watchlist context
│       │   ├── hooks/
│       │   │   ├── useAuth.jsx         # Auth hook
│       │   │   └── useAxiosPrivate.jsx # Axios with auth
│       │   ├── App.jsx                 # Main app component
│       │   └── main.jsx                # Entry point
│       ├── public/
│       ├── dist/                       # Production build
│       ├── package.json
│       └── vite.config.js
│
├── Server/
│   └── MagicStreamServer/
│       ├── controllers/
│       │   ├── accountController.go       # Account endpoints
│       │   ├── adminStatsController.go    # Admin analytics
│       │   ├── adminSubscriptionsController.go
│       │   ├── adminUsersController.go    # User management
│       │   ├── movieController.go         # Movie CRUD
│       │   ├── myListController.go        # Watchlist logic
│       │   ├── ratingController.go        # Ratings/reviews
│       │   ├── securityController.go      # Password/email
│       │   ├── subscriptionController.go  # Subscriptions
│       │   └── userController.go          # Auth
│       ├── database/
│       │   └── databaseConnection.go      # MongoDB setup
│       ├── middleware/
│       │   ├── authMiddleware.go          # JWT validation
│       │   └── requireAdmin.go            # Admin check
│       ├── models/
│       │   ├── emailVerificationModel.go
│       │   ├── movieModel.go
│       │   ├── passwordResetModel.go
│       │   ├── paymentModel.go
│       │   ├── planModel.go
│       │   ├── ratingModel.go
│       │   ├── subscriptionModel.go
│       │   ├── userModel.go
│       │   └── watchlistModel.go
│       ├── routes/
│       │   ├── protectedRoutes.go         # Auth required
│       │   └── unprotectedRoutes.go       # Public routes
│       ├── utils/
│       │   ├── rateLimiter.go
│       │   └── tokenUtil.go               # JWT helpers
│       ├── go.mod
│       ├── go.sum
│       └── main.go                        # Entry point
│
├── magic-stream-seed-data/
│   ├── movies-expanded.json               # Movie data
│   ├── seed-plans.js                      # Subscription plans
│   ├── AddTestUserDoc.json                # Test users
│   └── genres.json                        # Genre data
│
├── ACCOUNT_FEATURE_IMPLEMENTATION.md
├── MY_LIST_IMPLEMENTATION.md
├── SUBSCRIPTION_SIMULATION_IMPLEMENTATION.md
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Go** (v1.24 or higher) - [Download](https://golang.org/dl/)
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/downloads)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MagicStream.git
cd MagicStream-main
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd Server/MagicStreamServer

# Install Go dependencies
go mod download

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=magicstream
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
PORT=8080
EOF

# Build the application (optional)
go build -o MagicStreamServer
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd Client/magic-stream-client

# Install npm dependencies
npm install

# Create .env file (if needed for custom API URL)
echo "VITE_API_URL=http://localhost:8080" > .env
```

#### 4. Database Setup

Start MongoDB:

```bash
# macOS/Linux
mongod --dbpath /path/to/your/data/directory

# Or using Homebrew on macOS
brew services start mongodb-community

# Windows
# Start MongoDB service from Services or run mongod.exe
```

#### 5. Seed Database

**Seed Subscription Plans:**

```bash
# Connect to MongoDB
mongosh magicstream

# In MongoDB shell, run:
db.plans.insertMany([
  {
    plan_id: "basic",
    name: "Basic Plan",
    price: 9.99,
    quality: "HD",
    max_streams: 1,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    plan_id: "standard",
    name: "Standard Plan",
    price: 14.99,
    quality: "Full HD",
    max_streams: 2,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    plan_id: "premium",
    name: "Premium Plan",
    price: 19.99,
    quality: "4K",
    max_streams: 4,
    created_at: new Date(),
    updated_at: new Date()
  }
]);
```

**Seed Movies (optional):**

```bash
# Import movies from seed data
mongoimport --db magicstream --collection movies --file magic-stream-seed-data/movies-expanded.json --jsonArray
```

### Running the Application

#### Start Backend Server

```bash
cd Server/MagicStreamServer
go run main.go

# You should see:
# Server running on :8080
# Plan indexes created successfully
# Subscription indexes created successfully
# Watchlist indexes created successfully
# Rating indexes created successfully
```

#### Start Frontend Development Server

```bash
cd Client/magic-stream-client
npm run dev

# You should see:
# VITE v6.4.1  ready in XXX ms
# ➜  Local:   http://localhost:5173/
```

#### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Test Credentials

If you've seeded test users, you can use:

```
Email: testuser@example.com
Password: password123
```

Or register a new account through the UI.

---

## 📚 API Documentation

### Base URL

```
http://localhost:8080
```

### Authentication

Most endpoints require authentication via JWT token stored in HTTP-only cookie. Include the cookie in requests after login.

---

### 🔓 Public Endpoints

<details>
<summary><b>POST /register</b> - Register new user</summary>

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user_id": "507f1f77bcf86cd799439011"
}
```
</details>

<details>
<summary><b>POST /login</b> - User login</summary>

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "user_id": "507f1f77bcf86cd799439011",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

Sets HTTP-only cookie: `access_token`
</details>

<details>
<summary><b>GET /movies</b> - Browse movies</summary>

**Query Parameters:**
- `genre` (optional) - Filter by genre name
- `search` (optional) - Search by title
- `limit` (optional) - Number of results
- `offset` (optional) - Pagination offset

**Response (200 OK):**
```json
[
  {
    "_id": "...",
    "imdb_id": "tt0111161",
    "title": "The Shawshank Redemption",
    "poster_path": "https://image.tmdb.org/...",
    "youtube_id": "PLl99DlL6b4",
    "genre": [
      {
        "genre_id": 2,
        "genre_name": "Drama"
      }
    ],
    "admin_review": "A masterpiece of storytelling...",
    "ranking": {
      "ranking_value": 1,
      "ranking_name": "Excellent"
    }
  }
]
```
</details>

<details>
<summary><b>GET /movies/:imdb_id</b> - Get movie details</summary>

**Response (200 OK):**
```json
{
  "_id": "...",
  "imdb_id": "tt0111161",
  "title": "The Shawshank Redemption",
  "poster_path": "https://image.tmdb.org/...",
  "youtube_id": "PLl99DlL6b4",
  "genre": [...],
  "admin_review": "...",
  "ranking": {...}
}
```
</details>

<details>
<summary><b>GET /movies/:imdb_id/ratings</b> - Get movie ratings</summary>

**Response (200 OK):**
```json
{
  "avg": 4.5,
  "count": 127,
  "recent": [
    {
      "rating": 5,
      "review_text": "Amazing movie!",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```
</details>

<details>
<summary><b>POST /forgot-password</b> - Request password reset</summary>

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If the email exists, a reset token has been generated",
  "token": "abc123def456...",
  "expires_at": "2024-01-15T11:30:00Z"
}
```

**Note:** In production, token would be sent via email, not in response.
</details>

<details>
<summary><b>POST /reset-password</b> - Reset password</summary>

**Request Body:**
```json
{
  "token": "abc123def456...",
  "new_password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```
</details>

---

### 🔐 Protected Endpoints

All endpoints below require authentication (JWT cookie).

<details>
<summary><b>GET /me</b> - Get current user profile</summary>

**Response (200 OK):**
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "role": "USER",
  "favourite_genres": [
    {
      "genre_id": 1,
      "genre_name": "Action"
    }
  ],
  "email_verified": true,
  "subscription": {
    "plan_id": "premium",
    "plan_name": "Premium Plan",
    "status": "ACTIVE",
    "expires_at": "2024-02-15T00:00:00Z",
    "can_stream": true
  },
  "ratings_count": 12
}
```
</details>

<details>
<summary><b>PUT /me/preferences</b> - Update user preferences</summary>

**Request Body:**
```json
{
  "favourite_genres": [
    {
      "genre_id": 1,
      "genre_name": "Action"
    },
    {
      "genre_id": 2,
      "genre_name": "Drama"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "Preferences updated successfully",
  "favourite_genres": [...]
}
```
</details>

<details>
<summary><b>GET /plans</b> - List subscription plans</summary>

**Response (200 OK):**
```json
[
  {
    "_id": "...",
    "plan_id": "basic",
    "name": "Basic Plan",
    "price": 9.99,
    "quality": "HD",
    "max_streams": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```
</details>

<details>
<summary><b>POST /subscribe</b> - Subscribe to plan</summary>

**Request Body:**
```json
{
  "plan_id": "premium"
}
```

**Response (200 OK):**
```json
{
  "message": "Subscription activated successfully",
  "plan_id": "premium",
  "plan_name": "Premium Plan",
  "expires_at": "2024-02-15T00:00:00Z"
}
```

Subscription is activated for 30 days from the current date.
</details>

<details>
<summary><b>GET /mylist</b> - Get user's watchlist</summary>

**Response (200 OK):**
```json
[
  {
    "_id": "...",
    "imdb_id": "tt0111161",
    "title": "The Shawshank Redemption",
    "poster_path": "https://...",
    "youtube_id": "PLl99DlL6b4",
    "genre": [...],
    "admin_review": "...",
    "ranking": {...}
  }
]
```
</details>

<details>
<summary><b>POST /mylist/:imdb_id</b> - Add movie to watchlist</summary>

**Response (201 Created):**
```json
{
  "message": "Movie added to your list"
}
```

**Response (200 OK):** If already in list
```json
{
  "message": "Movie already in your list"
}
```
</details>

<details>
<summary><b>DELETE /mylist/:imdb_id</b> - Remove from watchlist</summary>

**Response (200 OK):**
```json
{
  "message": "Movie removed from your list"
}
```
</details>

<details>
<summary><b>PUT /ratings/:imdb_id</b> - Rate/review movie</summary>

**Request Body:**
```json
{
  "rating": 5,
  "review_text": "Absolutely amazing movie!"
}
```

**Response (200 OK):**
```json
{
  "message": "Rating saved successfully",
  "rating": 5,
  "review_text": "Absolutely amazing movie!"
}
```
</details>

<details>
<summary><b>POST /verify-email/request</b> - Request email verification</summary>

**Response (200 OK):**
```json
{
  "message": "Email verification token generated (SIMULATION)",
  "token": "abc123def456...",
  "expires_at": "2024-01-16T00:00:00Z"
}
```
</details>

<details>
<summary><b>POST /verify-email/confirm</b> - Confirm email verification</summary>

**Request Body:**
```json
{
  "token": "abc123def456..."
}
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully"
}
```
</details>

---

### 👑 Admin Endpoints

All endpoints below require admin role (`role: "ADMIN"`).

<details>
<summary><b>GET /admin/users</b> - List all users</summary>

Returns array of all registered users with their details and subscription status.
</details>

<details>
<summary><b>GET /admin/users/:user_id</b> - Get user details</summary>

Returns detailed information about a specific user.
</details>

<details>
<summary><b>PUT /admin/users/:user_id</b> - Update user</summary>

Update user information (admin can modify any field).
</details>

<details>
<summary><b>DELETE /admin/users/:user_id</b> - Delete user</summary>

Permanently delete a user account.
</details>

<details>
<summary><b>POST /admin/movies</b> - Add new movie</summary>

Add a new movie to the catalog.
</details>

<details>
<summary><b>PUT /admin/movies/:imdb_id</b> - Update movie</summary>

Update movie details including title, poster, genres, admin review, etc.
</details>

<details>
<summary><b>DELETE /admin/movies/:imdb_id</b> - Delete movie</summary>

Remove a movie from the catalog.
</details>

<details>
<summary><b>GET /admin/subscriptions</b> - List all subscriptions</summary>

View all active subscriptions with analytics.
</details>

<details>
<summary><b>GET /admin/reviews</b> - List all reviews</summary>

View all user reviews across the platform for moderation.
</details>

---

## 🗄 Database Schema

### Collections

#### `users`
```javascript
{
  _id: ObjectId,
  first_name: String,
  last_name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  role: String ("USER" | "ADMIN"),
  favourite_genres: [
    {
      genre_id: Number,
      genre_name: String
    }
  ],
  email_verified: Boolean,
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `email_1` (unique)

---

#### `movies`
```javascript
{
  _id: ObjectId,
  imdb_id: String (unique),
  title: String,
  poster_path: String,
  youtube_id: String,
  genre: [
    {
      genre_id: Number,
      genre_name: String
    }
  ],
  admin_review: String,
  ranking: {
    ranking_value: Number,
    ranking_name: String
  },
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `imdb_id_1` (unique)

---

#### `plans`
```javascript
{
  _id: ObjectId,
  plan_id: String (unique),
  name: String,
  price: Number,
  quality: String,
  max_streams: Number,
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `plan_id_1` (unique)

---

#### `subscriptions`
```javascript
{
  _id: ObjectId,
  user_id: String,
  plan_id: String,
  status: String ("ACTIVE" | "CANCELED" | "EXPIRED"),
  started_at: Date,
  expires_at: Date,
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `user_id_1`
- `status_1`

---

#### `watchlists`
```javascript
{
  _id: ObjectId,
  user_id: String,
  imdb_id: String,
  created_at: Date
}
```

**Indexes:**
- `user_imdb_unique_idx` (unique compound: user_id + imdb_id)
- `user_created_at_idx` (user_id + created_at)

---

#### `ratings`
```javascript
{
  _id: ObjectId,
  user_id: String,
  imdb_id: String,
  rating: Number (1-5),
  review_text: String (optional),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `user_imdb_unique_idx` (unique compound: user_id + imdb_id)
- `imdb_id_1`

---

#### `password_resets`
```javascript
{
  _id: ObjectId,
  email: String,
  user_id: String,
  token: String (unique),
  expires_at: Date,
  used_at: Date (nullable),
  created_at: Date
}
```

**Indexes:**
- `token_1` (unique)
- `expires_at_1` (TTL index)

---

#### `email_verifications`
```javascript
{
  _id: ObjectId,
  user_id: String,
  token: String (unique),
  expires_at: Date,
  used_at: Date (nullable),
  created_at: Date
}
```

**Indexes:**
- `token_1` (unique)
- `expires_at_1` (TTL index)

---

## 📖 Usage Guide

### For End Users

#### 1. Getting Started

1. **Register an Account**
   - Navigate to `/register`
   - Fill in your details
   - Submit the form

2. **Login**
   - Navigate to `/login`
   - Enter your credentials
   - You'll be redirected to the homepage

#### 2. Browsing Movies

- **Home Page**: View featured movies
- **Filter by Genre**: Use the genre filter bar
- **Search**: Use the search bar to find specific movies
- **View Details**: Click on any movie card

#### 3. Managing Your Watchlist

- **Add to List**: Click the "+" button on any movie card
- **View List**: Click "My List" in the navigation
- **Remove from List**: Click the "✓" button on movies in your list

#### 4. Subscribing to Stream

1. Navigate to **Account** (click "Hi, [Your Name]" in header)
2. Go to the **Subscription** tab
3. Choose a plan:
   - **Basic** - $9.99/month (HD, 1 stream)
   - **Standard** - $14.99/month (Full HD, 2 streams)
   - **Premium** - $19.99/month (4K, 4 streams)
4. Click **Subscribe**
5. You can now stream any movie!

#### 5. Streaming Movies

- Click on a movie
- Click **Watch Now** or the play button
- If not subscribed, you'll see a paywall with subscription options
- If subscribed, enjoy streaming!

#### 6. Rating Movies

- Navigate to a movie's detail page
- Select your rating (1-5 stars)
- Optionally write a review
- Submit your rating

#### 7. Managing Your Account

Navigate to **Account** to access:

- **Profile**: View your information and subscription status
- **Preferences**: Set your favorite genres for better recommendations
- **Subscription**: Manage your plan
- **Ratings**: View your rating history
- **Security**: Verify email and reset password

### For Administrators

#### Accessing Admin Dashboard

1. Login with an admin account
2. Navigate to `/admin`
3. You'll see five management sections

#### Managing Users

- **View All Users**: See user list with details
- **Edit User**: Update user information
- **Delete User**: Remove user accounts
- **View Details**: Check subscription status and activity

#### Managing Movies

- **Add Movie**: Click "Add Movie" and fill in:
  - IMDB ID
  - Title
  - Poster URL
  - YouTube Trailer ID
  - Genres
  - Admin Review
  - Ranking

- **Edit Movie**: Click edit on any movie and update details
- **Delete Movie**: Remove movies from catalog

#### Monitoring Subscriptions

- View all active subscriptions
- Track subscription distribution
- Monitor revenue metrics

#### Moderating Reviews

- View all user reviews
- Monitor ratings across platform
- Take action on inappropriate content

---

## 🔒 Security

### Authentication & Authorization

- **JWT Tokens**: Secure token-based authentication
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access Control**: USER and ADMIN roles
- **Token Expiration**: Configurable expiration time

### Input Validation

- **Request Validation**: Using go-playground/validator
- **SQL Injection Prevention**: MongoDB parameterized queries
- **XSS Prevention**: React's built-in escaping

### Additional Security Measures

- **CORS Configuration**: Restricted to frontend URL
- **Rate Limiting**: Prevents brute force attacks
- **Secure Headers**: Protection against common vulnerabilities
- **Password Requirements**: Minimum length and complexity

### Environment Variables

**Never commit `.env` files!** Always use environment variables for:
- Database credentials
- JWT secrets
- API keys
- Third-party service credentials

---

## 💡 Development Notes

### Simulation Features

The following features are **simulated for development**:

#### Email Verification
- Tokens are returned in API response
- In production, send via email service (SendGrid, AWS SES, etc.)

#### Password Reset
- Tokens are returned in API response
- In production, send via email service

#### Payment Processing
- Subscriptions activate immediately without payment
- In production, integrate with Stripe, PayPal, etc.

### Design System

The application uses a **dark glassmorphism theme**:
- Semi-transparent backgrounds
- Backdrop filters and blurs
- Purple/blue accent colors
- Smooth transitions and animations

### State Management

- **React Context API** for global state:
  - `AuthProvider` - User authentication state
  - `WatchlistProvider` - Watchlist data and operations

- **Optimistic Updates** for better UX:
  - Watchlist toggles update immediately
  - Server synchronization happens in background

### Code Quality

- **ESLint** configured for React best practices
- **Go** follows standard Go conventions
- **Modular architecture** for maintainability
- **Error handling** at all levels

---

## 🔧 Troubleshooting

### Backend Issues

<details>
<summary><b>MongoDB Connection Error</b></summary>

**Problem:** `Failed to connect to MongoDB`

**Solutions:**
1. Ensure MongoDB is running: `brew services list` (macOS) or check Windows Services
2. Verify `MONGODB_URI` in `.env` is correct
3. Check MongoDB logs for errors
4. Try connecting with mongosh: `mongosh mongodb://localhost:27017`
</details>

<details>
<summary><b>Port Already in Use</b></summary>

**Problem:** `bind: address already in use`

**Solutions:**
1. Find process using port 8080: `lsof -i :8080` (macOS/Linux) or `netstat -ano | findstr :8080` (Windows)
2. Kill the process or change PORT in `.env`
</details>

<details>
<summary><b>JWT Token Errors</b></summary>

**Problem:** `invalid token` or `token expired`

**Solutions:**
1. Clear browser cookies
2. Login again
3. Check `JWT_SECRET` is set in `.env`
4. Verify token expiration settings
</details>

### Frontend Issues

<details>
<summary><b>CORS Errors</b></summary>

**Problem:** `blocked by CORS policy`

**Solutions:**
1. Ensure backend CORS middleware includes frontend URL
2. Check `FRONTEND_URL` in backend `.env`
3. Verify you're accessing frontend at the correct URL (http://localhost:5173)
</details>

<details>
<summary><b>API Request Failures</b></summary>

**Problem:** Network errors or 404 responses

**Solutions:**
1. Verify backend server is running (check http://localhost:8080)
2. Check `VITE_API_URL` in frontend `.env`
3. Open browser DevTools > Network tab to inspect requests
4. Check backend logs for errors
</details>

<details>
<summary><b>Build Errors</b></summary>

**Problem:** `npm run build` fails

**Solutions:**
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Check for ESLint errors: `npm run lint`
4. Update Node.js to v18+
</details>

### Database Issues

<details>
<summary><b>Missing Indexes</b></summary>

**Problem:** Queries are slow or unique constraints not working

**Solutions:**
1. Check server startup logs for index creation messages
2. Manually verify indexes: `db.collection_name.getIndexes()`
3. Recreate indexes if needed (see database setup section)
</details>

<details>
<summary><b>Duplicate Key Errors</b></summary>

**Problem:** `E11000 duplicate key error`

**Solutions:**
1. Check if trying to insert duplicate email, imdb_id, etc.
2. Verify unique indexes are created correctly
3. Use upsert operations where appropriate
</details>

---

## 🚀 Future Enhancements

### High Priority

- [ ] **Real Email Service Integration**
  - SendGrid or AWS SES for email verification
  - Password reset emails
  - Subscription notifications

- [ ] **Payment Gateway Integration**
  - Stripe or PayPal for real payments
  - Subscription auto-renewal
  - Invoice generation

- [ ] **Video CDN Integration**
  - Replace YouTube embeds with proper video hosting
  - HLS/DASH adaptive streaming
  - DRM protection

### Medium Priority

- [ ] **Social Features**
  - Share movies with friends
  - Comment on reviews
  - Follow other users

- [ ] **Watch History**
  - Track watched movies
  - Resume watching from where you left off
  - Watch time analytics

- [ ] **Advanced Search**
  - Full-text search
  - Advanced filters (year, rating, duration)
  - Sort options

- [ ] **Notifications System**
  - New movie alerts
  - Subscription expiry reminders
  - New reviews on favorited movies

### Low Priority

- [ ] **Multi-language Support**
  - i18n implementation
  - Multiple subtitle options

- [ ] **Mobile Applications**
  - React Native iOS app
  - React Native Android app

- [ ] **Performance Optimizations**
  - Server-side rendering (SSR)
  - Code splitting
  - Image lazy loading

- [ ] **Analytics Dashboard**
  - User engagement metrics
  - Revenue analytics
  - Popular movies tracking

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Coding Standards

- **Go**: Follow standard Go conventions and use `gofmt`
- **JavaScript/React**: Follow ESLint rules configured in the project
- **Commits**: Use clear, descriptive commit messages
- **Documentation**: Update README and API docs for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@tuananhsilly](https://github.com/tuananhsilly)
- Email: alnheae@gmail.com

---

## 🙏 Acknowledgments

- **React Team** for the amazing frontend library
- **Go Team** for the efficient backend language
- **MongoDB** for flexible database solution
- **TMDB** for movie data and posters
- **YouTube** for trailer hosting
- All open-source contributors

---



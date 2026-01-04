Got it. I’m going to (1) map the repo structure (FE/BE/DB/seed/scripts), (2) trace the end‑to‑end flows (auth → browse → details → playback → rankings/recs), (3) extract the current Mongo schemas + indexes from code and seed JSON, then (4) propose a realistic Netflix-like roadmap and a concrete DB expansion + file-level implementation guide grounded in the actual paths/routes/components I find.

[1 tool called]

Nice — the repo is cleanly split into a Vite React frontend (`Client/magic-stream-client`) and a Gin-based Go backend (`Server/MagicStreamServer`), plus standalone JSON seed data (`magic-stream-seed-data`). Next I’ll read the server entrypoint/routes/models and the FE networking/auth flow so we can accurately describe current behavior and gaps before proposing expansions.

[4 tools called]

Aha: the backend boots Gin on `:8080`, enables CORS with `ALLOWED_ORIGINS`, connects to Mongo via `database.Connect()`, then registers both protected and unprotected route groups (`routes/`). Next I’ll inspect those route files + controllers/models to enumerate the real API surface and data shapes before mapping FE usage.

[31 tools called]

Next I’ll map the “contract” between FE and BE by enumerating all API routes, env/config expectations, and how auth cookies + refresh are handled. After that, I’ll inspect the seed JSON + any seed scripts so our DB expansion plan is grounded in what you already load today.

[19 tools called]

### A) Codebase Understanding (Current State)

- **High-level architecture diagram (current)**
  - **User browser**
    - React UI (`Client/magic-stream-client/src/`)
    - Auth state persisted in LocalStorage (`src/context/AuthProvider.jsx`)
    - API calls via Axios w/ cookies (`src/api/axiosConfig.js`, `src/hooks/useAxiosPrivate.jsx`)
    - Video playback via YouTube embed (`src/components/stream/StreamMovie.jsx` → `react-player`)
  - **Go API**
    - Gin server on `:8080` (`Server/MagicStreamServer/main.go`)
    - JWT auth in HTTP-only cookies + refresh flow (`Server/MagicStreamServer/utils/tokenUtil.go`, `controllers/userController.go`)
    - Protected routes via middleware (`Server/MagicStreamServer/middleware/authMiddleware.go`)
    - AI call to OpenAI for “admin review → sentiment ranking” (`Server/MagicStreamServer/controllers/movieController.go`)
  - **MongoDB**
    - Collections opened by name (`Server/MagicStreamServer/database/databaseConnection.go`)
    - Core collections used: `movies`, `users`, `genres`, `rankings` (see controllers/models)

- **FE summary: key pages/components, player flow, state management, networking layer**
  - **Routing / pages**
    - Routes defined in `Client/magic-stream-client/src/App.jsx`:
      - Public: `/` (Home), `/login`, `/register`
      - Protected by `RequiredAuth` (`src/components/RequiredAuth.jsx`): `/recommended`, `/review/:imdb_id`, `/stream/:yt_id`
    - Global header with auth-aware nav (`src/components/header/Header.jsx`)
  - **Catalog flow**
    - Home fetches full catalog: `GET /movies` (`src/components/home/Home.jsx`)
    - Grid rendering: `Movies.jsx` → `Movie.jsx` cards (`src/components/movies/Movies.jsx`, `src/components/movie/Movie.jsx`)
  - **Player flow (paid-stream simulation)**
    - Click movie card links to `/stream/:youtube_id` (`Movie.jsx`)
    - `/stream/:yt_id` is **auth-gated** (wrapped in `RequiredAuth`)
    - Player is purely FE: `ReactPlayer` loads `https://www.youtube.com/watch?v=${yt_id}` (`src/components/stream/StreamMovie.jsx`)
  - **Recommendations flow**
    - Protected page `/recommended` calls `GET /recommendedmovies` using `useAxiosPrivate()` (`src/components/recommended/Recommended.jsx`)
  - **Reviews flow**
    - Protected page `/review/:imdb_id` fetches `GET /movie/:imdb_id` and (if ADMIN) can `PATCH /updatereview/:imdb_id` (`src/components/review/Review.jsx`)
  - **State management**
    - **Auth**: `AuthProvider` stores `auth` in React Context + persists to `localStorage` key `user` (`src/context/AuthProvider.jsx`)
    - Everything else is local component state (`useState`/`useEffect`)
  - **Networking layer**
    - `axiosClient`: baseURL from `VITE_API_BASE_URL`, `withCredentials: true` for cookies (`src/api/axiosConfig.js`)
    - `useAxiosPrivate`: creates an axios instance and adds a **401 → POST /refresh → retry** response interceptor (`src/hooks/useAxiosPrivate.jsx`)

- **BE summary: routes/endpoints, services, models, middleware, recommendation pipeline**
  - **Server bootstrap**
    - Gin + CORS (uses `ALLOWED_ORIGINS`, defaults to `http://localhost:5173`) (`Server/MagicStreamServer/main.go`)
    - Mongo client from `database.Connect()` using `MONGODB_URI` (`database/databaseConnection.go`)
  - **Unprotected endpoints** (`Server/MagicStreamServer/routes/unprotectedRoutes.go`)
    - `GET /movies` → list all movies (`controllers/movieController.go:GetMovies`)
    - `GET /genres` → list genres (`movieController.go:GetGenres`)
    - `POST /register` → create user (`controllers/userController.go:RegisterUser`)
    - `POST /login` → sets `access_token` + `refresh_token` cookies, returns user profile (`userController.go:LoginUser`)
    - `POST /logout` → clears cookies + clears DB tokens **by user_id in body** (`userController.go:LogoutHandler`)
    - `POST /refresh` → validates refresh cookie, mints new cookies (`userController.go:RefreshTokenHandler`)
  - **Protected endpoints** (`Server/MagicStreamServer/routes/protectedRoutes.go`)
    - `GET /movie/:imdb_id` → movie detail (requires JWT cookie) (`movieController.go:GetMovie`)
    - `POST /addmovie` → insert movie (requires JWT cookie; **no admin check**) (`movieController.go:AddMovie`)
    - `GET /recommendedmovies` → personalized list (requires JWT cookie) (`movieController.go:GetRecommendedMovies`)
    - `PATCH /updatereview/:imdb_id` → admin-only sentiment ranking update (`movieController.go:AdminReviewUpdate`)
  - **Auth middleware**
    - Reads `access_token` cookie (`utils/tokenUtil.go:GetAccessToken`)
    - Validates JWT and injects `userId` + `role` into Gin context (`middleware/authMiddleware.go`)
  - **Models (Mongo document shapes)**
    - `User` / `UserLogin` / `UserResponse` (`models/userModel.go`)
    - `Movie`, `Genre`, `Ranking` (`models/movieModel.go`)
  - **Recommendation pipeline (actual behavior)**
    - Inputs:
      - User’s embedded `favourite_genres` (stored on registration)
      - Movies’ embedded `ranking` (maintained by admin review update)
    - Query:
      - Filter movies where `genre.genre_name` ∈ user favourite genre names
      - Sort by `ranking.ranking_value` ascending (lower = better)
      - Limit via `RECOMMENDED_MOVIE_LIMIT` (default `5`)
      - Implemented in `controllers/movieController.go:GetRecommendedMovies`

- **Database summary: current collections/tables, document schemas, indexes, relationships (if any)**
  - **Collections used in code**
    - `movies`, `users`, `genres`, `rankings` (opened via `database.OpenCollection(name, client)` in controllers)
  - **Schemas (from `Server/MagicStreamServer/models/*` + seed JSON)**
    - **`movies`**
      - `imdb_id` (string), `title` (string), `poster_path` (url string), `youtube_id` (string)
      - `genre` (array of `{ genre_id:int, genre_name:string }`)
      - `admin_review` (string)
      - `ranking` (`{ ranking_value:int, ranking_name:string }`)
    - **`users`**
      - `user_id` (string), `first_name`, `last_name`, `email`, `password` (bcrypt hash)
      - `role` (“ADMIN” or “USER”)
      - `token`, `refresh_token` (stored but not used for request validation)
      - `favourite_genres` (array of `{genre_id, genre_name}`)
      - Note: model uses `bson:"update_at"` (typo) not `updated_at` (`models/userModel.go`)
    - **`genres`**
      - `{ genre_id:int, genre_name:string }`
    - **`rankings`**
      - `{ ranking_value:int, ranking_name:string }` (includes `Not_Ranked` = `999` in seed)
  - **Relationships**
    - Mostly **embedded** (movies embed genres/ranking; users embed favourite genres)
    - `genres`/`rankings` collections exist but are not referenced by foreign keys—used mainly for UI lists and AI prompt construction.
  - **Indexes**
    - No index creation code found in repo (so assume defaults only unless you created them manually in MongoDB).

- **Seed data summary: what data exists, how it is loaded, gaps/limitations**
  - **What exists** (`magic-stream-seed-data/`)
    - `movies.json`: 15 movies with the fields matching the `Movie` model (imdb, title, poster, youtube, genre[], admin_review, ranking)
    - `genres.json`: 9 genres (Comedy, Drama, …)
    - `rankings.json`: 6 rankings (Not_Ranked + Excellent…Terrible)
    - `users.json`: 3 users (1 ADMIN, 2 USER) with bcrypt hashes + embedded favourite genres
    - `AddTestMovieDoc.json`, `AddTestUserDoc.json`: single-doc examples (user doc contains plaintext password intended for registering, not direct insertion)
  - **How it is loaded**
    - No seed script/import tooling found in the codebase (no references to these JSON files in FE/BE). Practically, this means seeding is likely done manually (e.g., MongoDB Compass or `mongoimport`) outside the repo.
  - **Gaps/limitations visible in the seed**
    - Inconsistent casing/values that can break matching:
      - e.g., `"Sci-fi"` vs `"Sci-Fi"` appears across seed files
      - `"ranking_name": "Terrible\n"` includes a newline in one movie
    - Movies have minimal metadata (no synopsis, runtime, cast, year, maturity rating, languages, etc.)

- **Current limitations and technical debt (based on code evidence)**
  - **Config / environment**
    - No `.env.example` found; required envs are only discoverable by reading code (`MONGODB_URI`, `DATABASE_NAME`, `ALLOWED_ORIGINS`, `OPENAI_API_KEY`, `BASE_PROMPT_TEMPLATE`, `SECRET_KEY`, `SECRET_REFRESH_KEY`, etc.).
  - **Auth/security correctness**
    - `POST /logout` is **unprotected** and takes `user_id` from the request body (`controllers/userController.go:LogoutHandler`) → any caller could attempt to log out arbitrary users by user_id.
    - Tokens are cleared in DB on logout, but **requests do not validate against DB token state** (middleware only validates JWT signature/expiry), so DB token fields don’t actually enforce logout/session invalidation.
    - `POST /addmovie` is protected but **not admin-restricted** (`routes/protectedRoutes.go` + `controllers/movieController.go:AddMovie`).
  - **Env loading bug risk**
    - `SECRET_KEY` / `SECRET_REFRESH_KEY` are read into package globals at import time (`utils/tokenUtil.go`), but `.env` is loaded later in `main.go`/`databaseConnection.go`. If those secrets are not set in the real OS env, JWT signing may silently use empty keys.
  - **Data consistency**
    - Recommendations match on `genre.genre_name` (`GetRecommendedMovies`) → inconsistent genre naming in seed can cause missing recommendations.
    - User model uses `update_at` tags, while seed uses `updated_at` (`models/userModel.go` vs `magic-stream-seed-data/users.json`) → fields may not round-trip as intended.
  - **API ergonomics**
    - No pagination/search/filter params on `GET /movies` (it returns all movies).
    - Protected `GET /movie/:imdb_id` means “movie detail” is behind auth; OK for “paid” simulation, but limits public browsing realism.
  - **Frontend maintainability**
    - `src/api/axiosPrivateConfig.js` appears unused and hardcodes `http://localhost:9090` (port mismatch with BE default `:8080`).
    - `useAxiosPrivate` installs interceptors without cleanup, which can duplicate interceptors across re-renders/mounts.
    - Register UI labels favourite genres as optional, but BE validates `favourite_genres` as required (`models/userModel.go`).

---

### B) Feature Expansion Proposals (Prioritized Roadmap)

## 1) Must-have (high value, low/medium effort)

- **1. Search + filters + sorting on catalog**
  - **User story**: As a viewer, I want to search and filter movies by title/genre/ranking so I can find something quickly.
  - **UX flow**
    - Home shows search box + genre chips + sort dropdown (Top ranked / A–Z)
    - Typing updates results (debounced), clear button resets
  - **BE changes**
    - Extend `GET /movies` to accept query params: `q`, `genre_id`, `ranking_max`, `sort`, `limit`, `cursor/page`
    - Implement in `Server/MagicStreamServer/controllers/movieController.go:GetMovies` (or split into `catalogController.go`)
  - **FE changes**
    - Update `src/components/home/Home.jsx` to pass filters into `axiosClient.get('/movies', { params })`
    - Add `SearchBar` + `FilterBar` components under `src/components/`
  - **Data needs**
    - No new collections; add indexes on `movies` for genre + ranking + title search
  - **Complexity**: **S**
  - **Dependencies & risks**
    - Need consistent genre identifiers (prefer `genre_id` matching vs name matching)

- **2. Movie details page (metadata + review + actions)**
  - **User story**: As a viewer, I want a details page (synopsis, genres, ranking, trailer/stream button, add-to-list) to decide what to watch.
  - **UX flow**
    - Click movie card → details page
    - CTA: “Play” (if subscribed/auth), “Add to My List”
  - **BE changes**
    - Either (a) make `GET /movie/:imdb_id` unprotected, or (b) add a new unprotected `GET /movies/:imdb_id` for details
    - Add missing metadata fields to `models.Movie` and seed (see DB plan)
  - **FE changes**
    - Add `src/components/movieDetails/MovieDetails.jsx` route
    - Update `Movie.jsx` card link to details; play CTA navigates to `/stream/:yt_id`
  - **Data needs**
    - Extend `movies` docs (overview, runtime, year, etc.)
  - **Complexity**: **S**
  - **Dependencies & risks**
    - Requires expanding seed/movie docs; otherwise page is sparse

- **3. “My List” (watchlist)**
  - **User story**: As a user, I want to save movies to a list so I can watch later.
  - **UX flow**
    - On movie card/details: “+ My List” toggle
    - Nav item: “My List” page
  - **BE changes**
    - New protected endpoints (examples):
      - `POST /mylist/:imdb_id` (add)
      - `DELETE /mylist/:imdb_id` (remove)
      - `GET /mylist` (list)
    - Implement new controller e.g. `controllers/myListController.go`; register in `routes/protectedRoutes.go`
  - **FE changes**
    - Add `MyList.jsx` page under `src/components/myList/`
    - Add “My List” toggle UI on cards/details; fetch list via `useAxiosPrivate`
  - **Data needs**
    - New collection `watchlists` (or `user_lists`) rather than embedding an ever-growing array in `users`
  - **Complexity**: **S**
  - **Dependencies & risks**
    - Need unique constraint per user+movie to avoid duplicates

- **4. Continue Watching (playback progress tracking)**
  - **User story**: As a user, I want to resume where I left off.
  - **UX flow**
    - While playing, progress is periodically saved
    - Home shows “Continue Watching” row for logged-in users
  - **BE changes**
    - New protected endpoints:
      - `PUT /playback/:imdb_id` (upsert progress)
      - `GET /playback/continue` (top N recent with progress < 95%)
    - Add a `playback_progress` collection
  - **FE changes**
    - In `StreamMovie.jsx`, use `ReactPlayer` callbacks (`onProgress`, `onDuration`) to post progress via `useAxiosPrivate`
    - In `Home.jsx`, if `auth` exists, fetch continue list and render a row
  - **Data needs**
    - Store progress seconds, duration seconds, updated timestamps
  - **Complexity**: **M**
  - **Dependencies & risks**
    - Need to throttle writes (e.g., every 10–15s) to avoid spamming Mongo

- **5. Account settings: update favourite genres**
  - **User story**: As a user, I want to change my preferences so recommendations improve.
  - **UX flow**
    - Settings page with genre multi-select; Save updates recs immediately
  - **BE changes**
    - Protected endpoint: `PUT /me/preferences` (updates `favourite_genres`)
    - Add `GET /me` to fetch canonical server-side profile (also helps FE validate session)
  - **FE changes**
    - Add `/account` page; reuse genre chips from register (`Register.jsx`)
    - Update `auth` context after save
  - **Data needs**
    - Reuse `users.favourite_genres` (but make BE accept empty list if you truly want “optional”)
  - **Complexity**: **S**
  - **Dependencies & risks**
    - Resolve genre naming mismatch: recommend storing and matching by `genre_id`

- **6. Admin “content ops” basics (and enforce roles)**
  - **User story**: As an admin, I want to add/edit movies and reviews from an admin panel.
  - **UX flow**
    - Admin dashboard lists movies, edit metadata, run review ranking update
  - **BE changes**
    - Enforce `ADMIN` role for:
      - `POST /addmovie` (currently any auth user can call it)
      - `PATCH /updatereview/:imdb_id` (already enforced)
    - Add endpoints to update movie metadata: `PATCH /movie/:imdb_id`
  - **FE changes**
    - Add `/admin` routes gated by `auth.role === 'ADMIN'`
    - Add Admin Movies table + edit forms
  - **Data needs**
    - Might extend `movies` schema with admin-managed metadata fields
  - **Complexity**: **M**
  - **Dependencies & risks**
    - OpenAI calls: add basic rate limiting + error handling; ensure ranking name mapping is robust

## 2) Should-have (medium effort, strong realism)

- **7. Multi-profile per account (Netflix-style)**
  - **User story**: As a household, we want separate profiles so recommendations/history don’t mix.
  - **UX flow**
    - After login: profile picker (create/choose)
    - Profile is stored in FE state and used for recs/history
  - **BE changes**
    - New collections + endpoints:
      - `profiles` collection
      - `GET /profiles`, `POST /profiles`, `PUT /profiles/:profile_id`
    - Update recommendation and playback endpoints to use `profile_id`
  - **FE changes**
    - Add `ProfilePicker.jsx` and store selected profile (context)
    - Update calls to include profile_id
  - **Data needs**
    - `profiles` + adjust `playback_progress`, `watchlists`, `ratings` to be per-profile
  - **Complexity**: **M**
  - **Dependencies & risks**
    - Requires consistent “active profile” handling across app routes

- **8. Subscription plans simulation + paywall**
  - **User story**: As a user, I want to “subscribe” (simulated) so I can access streaming; as an admin, I can manage plans.
  - **UX flow**
    - Unsubscribed users can browse details, but “Play” shows paywall
    - Subscribe page chooses plan (Basic/Standard/Premium)
  - **BE changes**
    - New `plans` and `subscriptions` collections
    - Protected endpoints:
      - `GET /plans`
      - `POST /subscribe` (creates active subscription)
      - Middleware check for “canStream” on `/stream`-related APIs (or FE gate if you keep stream purely FE)
  - **FE changes**
    - Add `/subscribe` flow + plan cards
    - Gate `/stream/:yt_id` route based on subscription state (from `/me` or auth payload)
  - **Data needs**
    - Store plan limits (max streams, quality) and subscription status
  - **Complexity**: **M**
  - **Dependencies & risks**
    - Keep it “simulation”: don’t integrate real payments; just model states and timestamps

- **9. User ratings + reviews (separate from admin review)**
  - **User story**: As a user, I want to rate a movie so the system learns what I like.
  - **UX flow**
    - On details page: star rating + optional text
    - Show aggregate rating and recent reviews
  - **BE changes**
    - New endpoints:
      - `PUT /ratings/:imdb_id` (upsert user rating)
      - `GET /movies/:imdb_id/ratings` (aggregate + recent)
    - Keep admin review separate, or merge into a unified “reviews” model with `author_role`
  - **FE changes**
    - Add rating widget and reviews list on details page
  - **Data needs**
    - New `ratings` (or `reviews`) collection; computed aggregates can be cached on movie doc
  - **Complexity**: **M**
  - **Dependencies & risks**
    - Aggregation cost; mitigate via cached `movies.rating_avg` and `rating_count`

- **10. Better recommendations (“Because you watched…”, blend signals)**
  - **User story**: As a user, I want smarter recommendations than just genre matching.
  - **UX flow**
    - Recommended page shows multiple rows:
      - “Top picks for you”
      - “Because you watched X”
      - “Trending in your favourite genres”
  - **BE changes**
    - Extend `GET /recommendedmovies` or add `GET /recommendations` returning multiple carousels
    - Use signals: favourite genres + recent watch history + user ratings
  - **FE changes**
    - Replace single grid with multi-row carousels
  - **Data needs**
    - Requires `playback_progress` and `ratings` collections
  - **Complexity**: **M**
  - **Dependencies & risks**
    - Start simple (rule-based) to keep scope student-friendly; avoid heavy ML

- **11. Password reset + email verification (simulation)**
  - **User story**: As a user, I want to reset my password if I forget it.
  - **UX flow**
    - “Forgot password” → request reset → receive token (display it in UI/dev console) → set new password
  - **BE changes**
    - Add `POST /forgot-password`, `POST /reset-password`
    - Store reset tokens with expiry (new collection or embedded in user)
  - **FE changes**
    - Add forgot/reset pages
  - **Data needs**
    - `password_resets` collection or `users.password_reset` subdoc
  - **Complexity**: **M**
  - **Dependencies & risks**
    - Don’t send real emails; keep it simulated and clearly documented

## 3) Nice-to-have (advanced, optional)

- **12. Concurrent stream/session limits (per plan)**
  - **User story**: As a platform, we want to limit concurrent playback based on subscription plan.
  - **UX flow**
    - Starting playback creates a session; if limit exceeded, show “Too many devices”
  - **BE changes**
    - `stream_sessions` collection + endpoints to start/heartbeat/end sessions
    - Middleware checks active sessions count before allowing playback
  - **FE changes**
    - Player sends heartbeat; handles “limit exceeded” gracefully
  - **Data needs**
    - Session docs with `user_id/profile_id/device_id/last_seen_at`
  - **Complexity**: **L**
  - **Dependencies & risks**
    - Clock/cleanup logic; require TTL index for session expiry

- **13. Kids profiles + maturity ratings**
  - **User story**: As a parent, I want a kids profile that hides mature content.
  - **UX flow**
    - Profile has maturity level; catalog filters accordingly
  - **BE changes**
    - Add `maturity_rating` to movies; filter in `GET /movies` and rec endpoints
  - **FE changes**
    - Profile settings UI + catalog badges
  - **Data needs**
    - Extend `movies` + `profiles`
  - **Complexity**: **L**
  - **Dependencies & risks**
    - Requires consistent maturity tags in seed data

- **14. Localization: languages/subtitles (metadata only)**
  - **User story**: As a viewer, I want to browse content by audio/subtitle language.
  - **UX flow**
    - Filters: Audio language, subtitles available
  - **BE changes**
    - Extend movies schema + query filtering
  - **FE changes**
    - Filter UI + movie details display
  - **Data needs**
    - `movies.audio_languages`, `movies.subtitle_languages`
  - **Complexity**: **M**
  - **Dependencies & risks**
    - Seed data must be updated to be meaningful

---

### C) Database Expansion Plan (If Needed)

- **Do we need DB changes to support the roadmap?**  
  - **Yes.** Current schema only supports: users (with favourite genres), movies (with admin review + ranking), and simple recommendations. “My List”, “Continue Watching”, multi-profile, subscriptions, and user ratings all need additional persistent data.

- **What existing collections/schemas are missing**
  - **Unbounded user activity** (watch history/progress) should not be embedded in `users` documents.
  - **Per-user/per-profile lists and ratings** don’t exist.
  - **Subscription state** doesn’t exist (key for “paid streaming simulation” realism).
  - **Movie metadata** is too minimal for a true “details” experience.

- **Proposed collections and/or schema updates (MongoDB)**

  - **1) `movies` (schema update)**
    - **Example document (add fields)**
      ```json
      {
        "imdb_id": "tt0111161",
        "title": "The Shawshank Redemption",
        "overview": "Two imprisoned men bond over a number of years...",
        "release_year": 1994,
        "runtime_minutes": 142,
        "poster_path": "https://...",
        "youtube_id": "PLl99DlL6b4",
        "genre": [{ "genre_id": 2, "genre_name": "Drama" }],
        "admin_review": "I loved the acting...",
        "ranking": { "ranking_value": 1, "ranking_name": "Excellent" },
        "maturity_rating": "PG-13",
        "audio_languages": ["en"],
        "subtitle_languages": ["en", "es"],
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
      ```
    - **Suggested indexes**
      - Unique: `{ imdb_id: 1 }`
      - Filter/sort for recs: `{ "genre.genre_id": 1, "ranking.ranking_value": 1 }`
      - Search: text index on `title` (and optionally `overview`)

  - **2) `playback_progress` (new)**
    - **Purpose**: Continue Watching / resume playback
    - **Example**
      ```json
      {
        "user_id": "684535a8c3d7e6b4ac1c5203",
        "profile_id": "prof_123", 
        "imdb_id": "tt0111161",
        "youtube_id": "PLl99DlL6b4",
        "progress_seconds": 3120,
        "duration_seconds": 8520,
        "last_watched_at": "2026-01-04T10:20:00Z",
        "updated_at": "2026-01-04T10:20:00Z"
      }
      ```
    - **Indexes**
      - Unique upsert key: `{ user_id: 1, profile_id: 1, imdb_id: 1 }`
      - Continue watching query: `{ user_id: 1, profile_id: 1, last_watched_at: -1 }`

  - **3) `watchlists` (new)**
    - **Purpose**: My List
    - **Example**
      ```json
      {
        "user_id": "684535a8c3d7e6b4ac1c5203",
        "profile_id": "prof_123",
        "imdb_id": "tt0111161",
        "added_at": "2026-01-04T09:00:00Z"
      }
      ```
    - **Indexes**
      - Unique: `{ user_id: 1, profile_id: 1, imdb_id: 1 }`
      - List page: `{ user_id: 1, profile_id: 1, added_at: -1 }`

  - **4) `ratings` (new)**
    - **Purpose**: User ratings/reviews + rec signals
    - **Example**
      ```json
      {
        "user_id": "684535a8c3d7e6b4ac1c5203",
        "profile_id": "prof_123",
        "imdb_id": "tt0111161",
        "rating": 5,
        "review_text": "Loved it.",
        "created_at": "2026-01-04T09:30:00Z",
        "updated_at": "2026-01-04T09:30:00Z"
      }
      ```
    - **Indexes**
      - Unique: `{ user_id: 1, profile_id: 1, imdb_id: 1 }`
      - Movie reviews: `{ imdb_id: 1, created_at: -1 }`

  - **5) `profiles` (new; optional until you implement multi-profile)**
    - **Example**
      ```json
      {
        "profile_id": "prof_123",
        "user_id": "684535a8c3d7e6b4ac1c5203",
        "name": "Sarah",
        "avatar": "avatar_1",
        "is_kids": false,
        "maturity_level": "PG-13",
        "favourite_genre_ids": [5, 6, 8],
        "created_at": "2026-01-04T08:00:00Z"
      }
      ```
    - **Indexes**
      - Unique: `{ user_id: 1, name: 1 }`
      - Lookup: `{ profile_id: 1 }` unique

  - **6) `plans` + `subscriptions` (new; for paid simulation)**
    - **`plans` example**
      ```json
      { "plan_id": "basic", "price_monthly": 5.99, "max_streams": 1, "max_quality": "720p" }
      ```
    - **`subscriptions` example**
      ```json
      {
        "user_id": "684535a8c3d7e6b4ac1c5203",
        "plan_id": "basic",
        "status": "active",
        "started_at": "2026-01-04T08:10:00Z",
        "next_billing_at": "2026-02-04T08:10:00Z"
      }
      ```
    - **Indexes**
      - `subscriptions`: unique `{ user_id: 1 }`
      - `plans`: unique `{ plan_id: 1 }`

- **Migration strategy**
  - **Seed evolution**
    - Keep existing seed JSON working (movies/users/genres/rankings).
    - Add new seed files: `plans.json`, and optionally `subscriptions.json`, `profiles.json`.
    - Add derived defaults:
      - For existing users, create a default profile (`profiles`) if/when you implement multi-profile.
      - For existing movies, populate added metadata fields with placeholders.
  - **Backward compatibility**
    - Make new fields optional in Go models initially (`omitempty`) and backfill gradually.
    - Keep existing endpoints stable while adding new ones; don’t break `GET /movies`/`/recommendedmovies`.

- **Data integrity and validation**
  - **Backend (primary)**: extend Go struct validation tags (currently used in `models/*` and `validator` in controllers).
  - **MongoDB (optional bonus)**: add collection validators for critical constraints (rating range 1–5, non-negative progress, etc.).

- **Performance considerations**
  - **Query patterns**
    - Catalog browsing: filter by genre + sort by ranking + search by title → needs the proposed indexes on `movies`
    - Continue Watching: by user/profile ordered by recent → needs index on `(user_id, profile_id, last_watched_at)`
    - My List: by user/profile ordered by added_at → needs index on `(user_id, profile_id, added_at)`
  - **Avoid over-embedding**
    - Do **not** embed watch history or ratings arrays inside `users` or `movies` (unbounded growth). Use separate collections.

---

### D) Concrete Implementation Guide

- **Step-by-step implementation plan (milestones)**
  - **Milestone 1 (stability + correctness)**: add `.env.example`, fix auth/logout correctness, add basic indexes.
  - **Milestone 2 (catalog UX)**: implement search/filter/sort on `GET /movies` and FE filter UI.
  - **Milestone 3 (details page)**: build Movie Details page + extend movie metadata + seed update.
  - **Milestone 4 (My List)**: add `watchlists` collection + endpoints + FE page/toggles.
  - **Milestone 5 (Continue Watching)**: add `playback_progress` + FE player progress saving + home row.
  - **Milestone 6 (paid realism)**: add plans/subscription simulation + gate “Play”.
  - **Milestone 7 (personalization upgrade)**: add ratings and smarter recommendations.

- **Specific file-level guidance**

  - **Backend (Gin/Go)**
    - **Routes**
      - Add new endpoints to `Server/MagicStreamServer/routes/protectedRoutes.go` (keeps current pattern).
      - Consider splitting into route groups (optional): `routes/catalogRoutes.go`, `routes/userRoutes.go`, etc.
    - **Controllers**
      - Add new controller files in `Server/MagicStreamServer/controllers/`, following existing signature style `func X(client *mongo.Client) gin.HandlerFunc`.
      - Examples:
        - `controllers/watchlistController.go`
        - `controllers/playbackController.go`
        - `controllers/profileController.go`
        - `controllers/subscriptionController.go`
    - **Models**
      - Add/extend structs in `Server/MagicStreamServer/models/`:
        - `watchlistModel.go`, `playbackModel.go`, `subscriptionModel.go`, `profileModel.go`
      - Extend `models.Movie` (in `models/movieModel.go`) with metadata fields.
    - **Middleware**
      - Add role guards in `middleware/` or reuse `utils.GetRoleFromContext`:
        - Enforce admin role on `POST /addmovie` (currently missing).
    - **DB**
      - Add an index creation helper (optional) or document required indexes in README; no index code exists today.

  - **Frontend (React/Vite)**
    - **Routing**
      - Add routes in `Client/magic-stream-client/src/App.jsx`:
        - `/movie/:imdb_id` (details)
        - `/my-list`
        - `/account`
        - `/subscribe`
        - `/admin` (admin-only)
    - **Components**
      - Add new folders under `src/components/`:
        - `movieDetails/`, `myList/`, `account/`, `subscribe/`, `admin/`, `continueWatching/`
    - **Networking**
      - Continue using `axiosClient` for public calls and `useAxiosPrivate` for protected calls.
      - Prefer adding `GET /me` and calling it on app start to validate session vs trusting LocalStorage alone.
    - **Player progress**
      - Enhance `src/components/stream/StreamMovie.jsx` with periodic progress updates.

  - **Seed scripts + sample data**
    - Add a `scripts/seed/` folder (new) with a simple Node or Go seeder.
    - Reuse `magic-stream-seed-data/*.json` as inputs; add new seed JSONs for new collections.

- **Pseudocode snippets**

  - **One new endpoint (BE): upsert playback progress**

```go
// PUT /playback/:imdb_id (protected)
func UpsertPlayback(client *mongo.Client) gin.HandlerFunc {
  return func(c *gin.Context) {
    userId := mustGetUserIdFromContext(c)  // like utils.GetUserIdFromContext
    imdbID := c.Param("imdb_id")

    var body struct {
      ProfileID       string  `json:"profile_id"`
      YouTubeID       string  `json:"youtube_id"`
      ProgressSeconds float64 `json:"progress_seconds"`
      DurationSeconds float64 `json:"duration_seconds"`
    }
    bindJSONOr400(c, &body)

    // validate: non-negative; duration>0; progress<=duration
    col := OpenCollection("playback_progress", client)

    filter := bson.M{"user_id": userId, "profile_id": body.ProfileID, "imdb_id": imdbID}
    update := bson.M{"$set": bson.M{
      "youtube_id": body.YouTubeID,
      "progress_seconds": body.ProgressSeconds,
      "duration_seconds": body.DurationSeconds,
      "last_watched_at": time.Now(),
      "updated_at": time.Now(),
    }}

    col.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
    c.JSON(200, gin.H{"ok": true})
  }
}
```

  - **One new FE data-fetching + UI flow: “Continue Watching” row on Home**

```jsx
// inside Home.jsx
const { auth } = useAuth();
const axiosPrivate = useAxiosPrivate();

useEffect(() => {
  if (!auth) return;

  let cancelled = false;
  (async () => {
    const res = await axiosPrivate.get("/playback/continue");
    if (!cancelled) setContinueWatching(res.data); // array of { imdb_id, youtube_id, progress_seconds, ... }
  })();

  return () => { cancelled = true; };
}, [auth]);

// render a horizontal row of cards; clicking goes to /stream/:yt_id and starts/resumes
```

  - **One seed data update script (illustrative)**
```js
// Node script idea: load JSON files and insert into collections with basic cleanup
import { MongoClient } from "mongodb";
import fs from "fs";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME;

const movies = JSON.parse(fs.readFileSync("./magic-stream-seed-data/movies.json"));
movies.forEach(m => {
  // normalize genre_name casing, trim ranking_name, add metadata defaults
  m.genre = m.genre.map(g => ({ ...g, genre_name: g.genre_name.trim() }));
  m.ranking.ranking_name = m.ranking.ranking_name.trim();
  m.created_at = new Date();
  m.updated_at = new Date();
});

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

await db.collection("movies").deleteMany({});
await db.collection("movies").insertMany(movies);

// create indexes
await db.collection("movies").createIndex({ imdb_id: 1 }, { unique: true });
await db.collection("movies").createIndex({ "genre.genre_id": 1, "ranking.ranking_value": 1 });

await client.close();
```

---

### E) Final Summary

- **5 key improvements that give the biggest “Netflix-like” impact**
  - **Movie Details page + richer metadata** (turns grid into a real browsing experience)
  - **Search/filters/sorting** (core usability for catalogs)
  - **My List** (saves intent and drives return visits)
  - **Continue Watching** (most “real streaming platform” feeling)
  - **Subscription plans simulation + paywall** (aligns tightly with “paid streaming” theme)

- **Recommended database changes (yes/no), with the top 3 schema updates**
  - **Yes**
  - **Top 3**
    - Add **`playback_progress`** collection (resume/continue watching)
    - Add **`watchlists`** collection (My List)
    - Expand **`movies`** schema with metadata + add key indexes (search/details/personalization)

- **What to implement first if only 1 week is available**
  - **Days 1–2**: Search/filter/sort + movie details page (small BE change + big UX win)
  - **Days 3–4**: My List (new collection + simple endpoints + FE page)
  - **Days 5–7**: Continue Watching (progress upsert + home row + throttled player updates)
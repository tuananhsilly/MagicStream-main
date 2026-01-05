import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faPaperPlane, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import axios from '../../api/axiosConfig';
import Spinner from '../spinner/Spinner';
import './Review.css';

const Review = () => {
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // User rating state
    const [userRating, setUserRating] = useState(null);
    const [userReviewText, setUserReviewText] = useState('');
    const [hoverRating, setHoverRating] = useState(null);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingSuccess, setRatingSuccess] = useState(false);
    
    // Aggregate ratings state
    const [aggregateRating, setAggregateRating] = useState({ avg: 0, count: 0, recent: [] });
    const [ratingsLoading, setRatingsLoading] = useState(false);
    
    const revText = useRef();
    const { imdb_id } = useParams();
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    // Fetch movie data
    useEffect(() => {
        const abortController = new AbortController();
        
        const fetchMovie = async () => {
            if (!imdb_id) {
                setError('Movie ID is required');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            
            try {
                const response = await axiosPrivate.get(`/movie/${imdb_id}`, {
                    signal: abortController.signal
                });
                
                if (!abortController.signal.aborted) {
                    setMovie(response.data);
                }
            } catch (err) {
                if (!abortController.signal.aborted) {
                    console.error('Error fetching movie:', err);
                    setError(err.response?.data?.error || 'Failed to load movie');
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        
        fetchMovie();
        
        return () => {
            abortController.abort();
        };
    }, [imdb_id]);

    // Fetch aggregate ratings (public endpoint)
    const fetchAggregateRatings = async () => {
        if (!imdb_id) return;
        
        setRatingsLoading(true);
        try {
            const response = await axios.get(`/movies/${imdb_id}/ratings`);
            setAggregateRating(response.data || { avg: 0, count: 0, recent: [] });
        } catch (err) {
            console.error('Error fetching ratings:', err);
        } finally {
            setRatingsLoading(false);
        }
    };

    // Fetch user's existing rating
    const fetchUserRating = async () => {
        if (!auth || !imdb_id) return;
        
        try {
            const response = await axiosPrivate.get('/me/ratings');
            const ratings = response.data || [];
            const existingRating = ratings.find(r => r.imdb_id === imdb_id);
            
            if (existingRating) {
                setUserRating(existingRating.rating);
                setUserReviewText(existingRating.review_text || '');
            }
        } catch (err) {
            console.error('Error fetching user rating:', err);
        }
    };

    useEffect(() => {
        fetchAggregateRatings();
        if (auth) {
            fetchUserRating();
        }
    }, [imdb_id, auth]);

    // Handle admin review submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccess(false);

        try {
            const response = await axiosPrivate.patch(`/updatereview/${imdb_id}`, {
                admin_review: revText.current.value
            });

            setMovie(prev => ({
                ...prev,
                admin_review: response.data?.admin_review ?? prev.admin_review,
                ranking: {
                    ranking_name: response.data?.ranking_name ?? prev.ranking?.ranking_name,
                    ranking_value: prev.ranking?.ranking_value ?? 1
                }
            }));

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error updating review:', err);
            setError(err.response?.data?.error || 'Failed to update review');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle user rating click
    const handleRatingClick = (star) => {
        setUserRating(star);
    };

    // Handle user rating submit
    const handleSubmitRating = async () => {
        if (!userRating || !auth) return;
        
        setRatingSubmitting(true);
        setRatingSuccess(false);
        
        try {
            await axiosPrivate.put(`/ratings/${imdb_id}`, {
                rating: userRating,
                review_text: userReviewText
            });
            
            setRatingSuccess(true);
            setTimeout(() => setRatingSuccess(false), 3000);
            
            // Refresh aggregate ratings
            fetchAggregateRatings();
        } catch (err) {
            console.error('Error submitting rating:', err);
            setError(err.response?.data?.error || 'Failed to submit rating');
        } finally {
            setRatingSubmitting(false);
        }
    };

    // Show loading spinner while fetching
    if (loading) {
        return <Spinner />;
    }

    // Show error state if fetch failed
    if (error && !movie) {
        return (
            <div className="review-container">
                <div className="review-wrapper">
                    <button 
                        className="back-button"
                        onClick={() => navigate('/')}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Back to Movies
                    </button>
                    <div className="error-state">
                        <p className="error-message">{error}</p>
                        <button 
                            className="retry-button"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Don't render content until movie data is loaded
    if (!movie) {
        return <Spinner />;
    }

    const displayRating = hoverRating || userRating || 0;

    return (
        <div className="review-container">
            <div className="review-wrapper">
                <button 
                    className="back-button"
                    onClick={() => navigate('/')}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back to Movies
                </button>

                <div className="review-grid">
                    {/* Movie Info Card */}
                    <div className="movie-info-card">
                        <div className="movie-poster-wrapper">
                            <img
                                src={movie.poster_path}
                                alt={movie.title}
                                className="review-movie-poster"
                            />
                            {movie.ranking?.ranking_name && (
                                <div className="ranking-badge">
                                    <FontAwesomeIcon icon={faStar} />
                                    {movie.ranking.ranking_name}
                                </div>
                            )}
                        </div>
                        <div className="movie-details">
                            <h2 className="movie-title-large">{movie.title}</h2>
                            <p className="movie-imdb">{movie.imdb_id}</p>
                            
                            {/* Aggregate Rating Display */}
                            <div className="aggregate-rating">
                                <div className="avg-rating-display">
                                    <FontAwesomeIcon icon={faStar} className="avg-star" />
                                    <span className="avg-value">
                                        {aggregateRating.avg > 0 ? aggregateRating.avg.toFixed(1) : 'N/A'}
                                    </span>
                                    <span className="rating-count">
                                        ({aggregateRating.count} {aggregateRating.count === 1 ? 'rating' : 'ratings'})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="review-content-area">
                        {/* User Rating Section - Show for all logged-in users */}
                        {auth && (
                            <div className="user-rating-section">
                                <div className="section-header">
                                    <h3 className="section-title">Rate this Movie</h3>
                                </div>
                                
                                {ratingSuccess && (
                                    <div className="alert-success">
                                        Rating {userRating ? 'updated' : 'submitted'} successfully!
                                    </div>
                                )}
                                
                                <div className="star-rating">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-btn ${displayRating >= star ? 'filled' : ''}`}
                                            onClick={() => handleRatingClick(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(null)}
                                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                        >
                                            <FontAwesomeIcon 
                                                icon={displayRating >= star ? faStar : faStarOutline} 
                                            />
                                        </button>
                                    ))}
                                    {userRating && (
                                        <span className="rating-label">{userRating}/5</span>
                                    )}
                                </div>
                                
                                <textarea
                                    value={userReviewText}
                                    onChange={(e) => setUserReviewText(e.target.value)}
                                    placeholder="Write a review (optional)..."
                                    className="user-review-textarea"
                                    rows={4}
                                />
                                
                                <button 
                                    className="submit-rating-btn"
                                    onClick={handleSubmitRating}
                                    disabled={!userRating || ratingSubmitting}
                                >
                                    {ratingSubmitting ? (
                                        <>
                                            <span className="spinner-small"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faPaperPlane} />
                                            {userRating ? 'Update Rating' : 'Submit Rating'}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Admin Review Section */}
                        <div className="review-section">
                            <div className="section-header">
                                <h3 className="section-title">
                                    {auth?.role === 'ADMIN' ? 'Admin Review' : 'Official Review'}
                                </h3>
                            </div>

                            {auth?.role === 'ADMIN' ? (
                                <form onSubmit={handleSubmit} className="review-form">
                                    {success && (
                                        <div className="alert-success">
                                            Review updated successfully!
                                        </div>
                                    )}
                                    
                                    <div className="form-group">
                                        <label htmlFor="adminReview" className="form-label">
                                            Write your review
                                        </label>
                                        <textarea
                                            id="adminReview"
                                            ref={revText}
                                            className="review-textarea"
                                            rows={10}
                                            defaultValue={movie?.admin_review}
                                            placeholder="Share your thoughts about this movie..."
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="submit-review-btn"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-small"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faPaperPlane} />
                                                Submit Review
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <div className="review-display">
                                    {movie.admin_review ? (
                                        <div className="review-content">
                                            <div className="review-author">
                                                <div className="author-avatar">A</div>
                                                <div className="author-info">
                                                    <p className="author-name">Admin Review</p>
                                                    <p className="author-role">Official Review</p>
                                                </div>
                                            </div>
                                            <p className="review-text">{movie.admin_review}</p>
                                        </div>
                                    ) : (
                                        <div className="empty-review">
                                            <p>No official review available yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Recent Reviews from Users */}
                        <div className="recent-reviews-section">
                            <div className="section-header">
                                <h3 className="section-title">User Reviews</h3>
                            </div>
                            
                            {ratingsLoading ? (
                                <div className="reviews-loading">
                                    <span className="spinner-small"></span>
                                    Loading reviews...
                                </div>
                            ) : aggregateRating.recent && aggregateRating.recent.length > 0 ? (
                                <div className="recent-reviews-list">
                                    {aggregateRating.recent.map((review, idx) => (
                                        <div key={idx} className="review-item">
                                            <div className="review-item-header">
                                                <div className="reviewer-avatar">
                                                    <FontAwesomeIcon icon={faUser} />
                                                </div>
                                                <div className="review-item-meta">
                                                    <div className="review-stars">
                                                        {[...Array(5)].map((_, i) => (
                                                            <FontAwesomeIcon 
                                                                key={i}
                                                                icon={i < review.rating ? faStar : faStarOutline} 
                                                                className={i < review.rating ? 'filled' : 'empty'}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="review-date">
                                                        {new Date(review.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            {review.review_text && (
                                                <p className="review-item-text">{review.review_text}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-reviews">
                                    <p>No user reviews yet. Be the first to rate this movie!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Review;

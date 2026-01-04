import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faPaperPlane, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import Spinner from '../spinner/Spinner';
import './Review.css';

const Review = () => {
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const revText = useRef();
    const { imdb_id } = useParams();
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    useEffect(() => {
        // Abort controller to prevent race conditions
        const abortController = new AbortController();
        
        const fetchMovie = async () => {
            // Only fetch if we have imdb_id
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
        
        // Cleanup: abort request if component unmounts or imdb_id changes
        return () => {
            abortController.abort();
        };
    }, [imdb_id]); // Removed axiosPrivate from dependencies to prevent re-fetches

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
                        </div>
                    </div>

                    {/* Review Section */}
                    <div className="review-section">
                        <div className="section-header">
                            <h3 className="section-title">
                                {auth?.role === 'ADMIN' ? 'Admin Review' : 'Review'}
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
                                        <p>No review available yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Review;
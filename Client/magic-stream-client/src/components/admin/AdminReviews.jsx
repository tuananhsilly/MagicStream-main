import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faEdit } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Spinner from '../spinner/Spinner';
import './AdminReviews.css';

const AdminReviews = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState("all"); // Fetch all movies for admin management
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMovies = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axiosPrivate.get('/movies', {
                    params: { page, limit: pageSize },
                });
                const moviesData = Array.isArray(response.data) 
                    ? response.data 
                    : (response.data.items || []);

                const reportedTotalItems = response.data?.totalItems 
                    ?? response.data?.total 
                    ?? moviesData.length;
                const reportedTotalPages = response.data?.totalPages
                    ?? (pageSize === "all" ? 1 : Math.max(1, Math.ceil(reportedTotalItems / (typeof pageSize === "number" ? pageSize : 20))));

                setMovies(moviesData);
                setTotalItems(reportedTotalItems);
                setTotalPages(reportedTotalPages);
            } catch (err) {
                console.error('Error fetching movies:', err);
                setError('Failed to load movies');
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, [axiosPrivate, page, pageSize]);

    if (loading) {
        return (
            <div className="admin-page-loading">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="admin-reviews">
            <div className="admin-reviews-container">
                <div className="admin-reviews-header">
                    <div>
                        <h1 className="admin-reviews-title">Reviews & Ranking</h1>
                        <p className="admin-reviews-subtitle">
                            Update admin reviews and AI-generated rankings
                        </p>
                    </div>
                    <Link to="/admin" className="back-btn">
                        <FontAwesomeIcon icon={faHome} />
                        Dashboard
                    </Link>
                </div>

                {error && (
                    <div className="error-message">{error}</div>
                )}

                <div className="info-box">
                    <p>
                        Click "Write Review" on any movie to update the admin review and trigger AI ranking analysis.
                        Rate limit: 5 requests per minute per user.
                    </p>
                    <p className="admin-reviews-subtext">
                        Showing {movies.length} of {totalItems || movies.length} movies — Page {page} / {totalPages}
                    </p>
                </div>

                <div className="movies-grid">
                    {movies.length === 0 ? (
                        <div className="empty-state">
                            <p>No movies available</p>
                        </div>
                    ) : (
                        movies.map((movie) => (
                            <div key={movie._id || movie.imdb_id} className="movie-card">
                                <div className="movie-poster-wrapper">
                                    <img 
                                        src={movie.poster_path} 
                                        alt={movie.title}
                                        className="movie-poster"
                                    />
                                    {movie.ranking?.ranking_name && (
                                        <div className="ranking-badge">
                                            {movie.ranking.ranking_name}
                                        </div>
                                    )}
                                </div>
                                <div className="movie-info">
                                    <h3 className="movie-title">{movie.title}</h3>
                                    <p className="movie-imdb">{movie.imdb_id}</p>
                                    {movie.admin_review && (
                                        <p className="movie-review-preview">
                                            {movie.admin_review.substring(0, 100)}...
                                        </p>
                                    )}
                                </div>
                                <button
                                    className="review-btn"
                                    onClick={() => navigate(`/review/${movie.imdb_id}`)}
                                >
                                    <FontAwesomeIcon icon={faEdit} />
                                    Write Review
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="admin-pagination">
                        <button
                            className="page-btn"
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Prev
                        </button>
                        <span className="page-status">
                            Page {page} / {totalPages}
                        </span>
                        <button
                            className="page-btn"
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReviews;


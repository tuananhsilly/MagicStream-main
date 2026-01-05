import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faHome, faSearch } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Spinner from '../spinner/Spinner';
import './AdminMovies.css';

const AdminMovies = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
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

    const filteredMovies = movies.filter(movie =>
        movie.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.imdb_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="admin-page-loading">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="admin-movies">
            <div className="admin-movies-container">
                <div className="admin-movies-header">
                    <div>
                        <h1 className="admin-movies-title">Movies Management</h1>
                        <p className="admin-movies-subtitle">
                            Showing {filteredMovies.length} of {totalItems || filteredMovies.length} movies
                        </p>
                    </div>
                    <Link to="/admin" className="back-btn">
                        <FontAwesomeIcon icon={faHome} />
                        Dashboard
                    </Link>
                </div>

                <div className="admin-movies-search">
                    <div className="search-wrapper">
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by title or IMDB ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="error-message">{error}</div>
                )}

                <div className="admin-movies-table-wrapper">
                    <table className="admin-movies-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>IMDB ID</th>
                                <th>Genres</th>
                                <th>Ranking</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovies.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-state">
                                        {searchQuery ? 'No movies found matching your search' : 'No movies available'}
                                    </td>
                                </tr>
                            ) : (
                                filteredMovies.map((movie) => (
                                    <tr key={movie._id || movie.imdb_id}>
                                        <td className="movie-title-cell">
                                            <div className="movie-title-wrapper">
                                                {movie.poster_path && (
                                                    <img 
                                                        src={movie.poster_path} 
                                                        alt={movie.title}
                                                        className="movie-thumbnail"
                                                    />
                                                )}
                                                <span>{movie.title}</span>
                                            </div>
                                        </td>
                                        <td className="imdb-id-cell">{movie.imdb_id}</td>
                                        <td className="genres-cell">
                                            {movie.genre?.map((g, idx) => (
                                                <span key={idx} className="genre-tag">
                                                    {g.genre_name}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="ranking-cell">
                                            <span className={`ranking-badge ranking-${movie.ranking?.ranking_value || 0}`}>
                                                {movie.ranking?.ranking_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="edit-btn"
                                                onClick={() => navigate(`/admin/movies/${movie.imdb_id}`)}
                                            >
                                                <FontAwesomeIcon icon={faEdit} />
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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

export default AdminMovies;


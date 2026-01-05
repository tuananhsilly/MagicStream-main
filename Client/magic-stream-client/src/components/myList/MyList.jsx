import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Spinner from '../spinner/Spinner';
import Movie from '../movie/Movie';
import '../shared/MoviesGrid.css';
import './MyList.css';

const MyList = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyList = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axiosPrivate.get('/mylist');
                setMovies(response.data || []);
            } catch (err) {
                console.error('Error fetching my list:', err);
                setError('Failed to load your list');
            } finally {
                setLoading(false);
            }
        };
        fetchMyList();
    }, [axiosPrivate]);

    const handleRemoveFromList = async (imdbId) => {
        try {
            await axiosPrivate.delete(`/mylist/${imdbId}`);
            // Remove from local state
            setMovies(prev => prev.filter(movie => movie.imdb_id !== imdbId));
        } catch (err) {
            console.error('Error removing from list:', err);
            setError('Failed to remove movie from list');
        }
    };

    if (loading) {
        return (
            <div className="my-list-loading">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="my-list-page">
            <div className="my-list-container">
                <div className="my-list-header">
                    <h1 className="my-list-title">My List</h1>
                    <p className="my-list-subtitle">
                        {movies.length} {movies.length === 1 ? 'movie' : 'movies'} saved
                    </p>
                </div>

                {error && (
                    <div className="error-message">{error}</div>
                )}

                {movies.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3 className="empty-title">Your list is empty</h3>
                        <p className="empty-subtitle">
                            Start adding movies to your list to watch them later
                        </p>
                        <button
                            className="browse-btn"
                            onClick={() => navigate('/')}
                        >
                            Browse Movies
                        </button>
                    </div>
                ) : (
                    <div className="movies-grid">
                        {movies.map((movie) => (
                            <Movie 
                                key={movie._id || movie.imdb_id}
                                movie={movie}
                                onRemoveFromList={handleRemoveFromList}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyList;


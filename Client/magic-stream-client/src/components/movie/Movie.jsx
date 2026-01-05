import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faStar, faPlus, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useWatchlist } from '../../context/WatchlistProvider';
import useAuth from '../../hooks/useAuth';
import './Movie.css';

const Movie = ({ movie, updateMovieReview, onRemoveFromList }) => {
    const { isInWatchlist, toggleWatchlist } = useWatchlist();
    const { auth } = useAuth();
    const inWatchlist = isInWatchlist(movie.imdb_id);

    const handleToggleWatchlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!auth) {
            return; // Should not happen if button is hidden
        }
        const success = await toggleWatchlist(movie.imdb_id);
        if (success && onRemoveFromList) {
            // If removing from MyList page, call the callback
            onRemoveFromList(movie.imdb_id);
        }
    };
    return (
        <article className="movie-card-wrapper">
            <Link
                to={`/stream/${movie.youtube_id}`}
                className="movie-card-link"
            >
                <div className="movie-card">
                    <div className="movie-poster-container">
                        <img 
                            src={movie.poster_path} 
                            alt={movie.title}
                            className="movie-poster"
                            loading="lazy"
                        />
                        <div className="movie-overlay">
                            <div className="play-button">
                                <FontAwesomeIcon icon={faPlay} />
                            </div>
                        </div>
                        
                        {movie.ranking?.ranking_name && (
                            <div className="movie-badge">
                                <FontAwesomeIcon icon={faStar} className="badge-icon" />
                                {movie.ranking.ranking_name}
                            </div>
                        )}
                        
                        {/* My List toggle button - only show for authenticated users */}
                        {auth && (
                            <button
                                className={`my-list-toggle ${inWatchlist ? 'in-list' : ''}`}
                                onClick={handleToggleWatchlist}
                                aria-label={inWatchlist ? 'Remove from My List' : 'Add to My List'}
                                title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
                            >
                                <FontAwesomeIcon icon={inWatchlist ? faCheck : faPlus} />
                            </button>
                        )}
                    </div>

                    <div className="movie-info">
                        <h5 className="movie-title">{movie.title}</h5>
                        <p className="movie-id">{movie.imdb_id}</p>
                    </div>

                    {updateMovieReview && (
                        <button
                            className="review-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                updateMovieReview(movie.imdb_id);
                            }}
                        >
                            Write Review
                        </button>
                    )}
                </div>
            </Link>
        </article>
    );
};

export default Movie;
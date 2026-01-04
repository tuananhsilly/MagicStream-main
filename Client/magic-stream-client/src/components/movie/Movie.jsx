import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faStar } from '@fortawesome/free-solid-svg-icons';
import './Movie.css';

const Movie = ({ movie, updateMovieReview }) => {
    return (
        <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
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
        </div>
    );
};

export default Movie;
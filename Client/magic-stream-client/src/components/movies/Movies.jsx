import Movie from '../movie/Movie';
import './Movies.css';

const Movies = ({ movies, updateMovieReview, message, total }) => {
    const displayCount = total !== undefined ? total : movies?.length || 0;
    
    return (
        <div className="movies-section">
            <div className="movies-container">
                {movies && movies.length > 0 ? (
                    <>
                        <div className="section-header">
                            <h2 className="section-title">
                                {updateMovieReview ? 'All Movies' : 'Recommended For You'}
                            </h2>
                            <p className="section-subtitle">
                                {displayCount} {displayCount === 1 ? 'movie' : 'movies'} {total !== undefined ? 'found' : 'available'}
                            </p>
                        </div>
                        
                        <div className="row movies-grid">
                            {movies.map((movie) => (
                                <Movie 
                                    key={movie._id} 
                                    updateMovieReview={updateMovieReview} 
                                    movie={movie} 
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🎬</div>
                        <h3 className="empty-title">{message || 'No movies found'}</h3>
                        <p className="empty-subtitle">
                            Check back later for new content
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Movies;
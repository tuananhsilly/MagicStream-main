import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave, faCheck } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import axiosClient from '../../api/axiosConfig';
import Spinner from '../spinner/Spinner';
import './AdminMovieEdit.css';

const AdminMovieEdit = () => {
    const { imdb_id } = useParams();
    const navigate = useNavigate();
    const axiosPrivate = useAxiosPrivate();
    
    const [movie, setMovie] = useState(null);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        poster_path: '',
        youtube_id: '',
        genre: [],
        admin_review: '',
        ranking: { ranking_value: 3, ranking_name: 'Okay' }
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch movie and genres in parallel
                const [movieRes, genresRes] = await Promise.all([
                    axiosPrivate.get(`/movie/${imdb_id}`),
                    axiosClient.get('/genres')
                ]);

                const movieData = movieRes.data;
                setMovie(movieData);
                setGenres(genresRes.data || []);

                // Initialize form with movie data
                setFormData({
                    title: movieData.title || '',
                    poster_path: movieData.poster_path || '',
                    youtube_id: movieData.youtube_id || '',
                    genre: movieData.genre || [],
                    admin_review: movieData.admin_review || '',
                    ranking: movieData.ranking || { ranking_value: 3, ranking_name: 'Okay' }
                });
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.response?.data?.error || 'Failed to load movie data');
            } finally {
                setLoading(false);
            }
        };

        if (imdb_id) {
            fetchData();
        }
    }, [imdb_id, axiosPrivate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleGenreToggle = (genreId, genreName) => {
        setFormData(prev => {
            const exists = prev.genre.find(g => g.genre_id === genreId);
            if (exists) {
                return {
                    ...prev,
                    genre: prev.genre.filter(g => g.genre_id !== genreId)
                };
            } else {
                return {
                    ...prev,
                    genre: [...prev.genre, { genre_id: genreId, genre_name: genreName }]
                };
            }
        });
    };

    const handleRankingChange = (e) => {
        const rankingValue = parseInt(e.target.value);
        const rankingNames = {
            1: 'Excellent',
            2: 'Good',
            3: 'Okay',
            4: 'Bad',
            5: 'Terrible'
        };
        setFormData(prev => ({
            ...prev,
            ranking: {
                ranking_value: rankingValue,
                ranking_name: rankingNames[rankingValue] || 'Okay'
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        setError(null);

        try {
            // Build update payload with only changed fields
            const updatePayload = {};
            
            if (formData.title !== movie.title) updatePayload.title = formData.title;
            if (formData.poster_path !== movie.poster_path) updatePayload.poster_path = formData.poster_path;
            if (formData.youtube_id !== movie.youtube_id) updatePayload.youtube_id = formData.youtube_id;
            
            // Compare genres (check if arrays are different)
            const genresChanged = JSON.stringify(formData.genre) !== JSON.stringify(movie.genre);
            if (genresChanged) updatePayload.genre = formData.genre;
            
            if (formData.admin_review !== movie.admin_review) updatePayload.admin_review = formData.admin_review;
            
            const rankingChanged = formData.ranking.ranking_value !== movie.ranking?.ranking_value ||
                                  formData.ranking.ranking_name !== movie.ranking?.ranking_name;
            if (rankingChanged) updatePayload.ranking = formData.ranking;

            if (Object.keys(updatePayload).length === 0) {
                setError('No changes detected');
                setSaving(false);
                return;
            }

            const response = await axiosPrivate.patch(`/movie/${imdb_id}`, updatePayload);
            
            setSuccess(true);
            setMovie(response.data);
            
            // Update form data with response
            setFormData({
                title: response.data.title,
                poster_path: response.data.poster_path,
                youtube_id: response.data.youtube_id,
                genre: response.data.genre,
                admin_review: response.data.admin_review,
                ranking: response.data.ranking
            });

            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error updating movie:', err);
            setError(err.response?.data?.error || 'Failed to update movie');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Spinner />;
    }

    if (error && !movie) {
        return (
            <div className="admin-movie-edit">
                <div className="admin-movie-edit-container">
                    <div className="error-state">
                        <p className="error-message">{error}</p>
                        <button onClick={() => navigate('/admin/movies')}>
                            Back to Movies
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-movie-edit">
            <div className="admin-movie-edit-container">
                <div className="edit-header">
                    <button 
                        className="back-button"
                        onClick={() => navigate('/admin/movies')}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Back to Movies
                    </button>
                    <h1 className="edit-title">Edit Movie</h1>
                </div>

                {success && (
                    <div className="success-message">
                        <FontAwesomeIcon icon={faCheck} />
                        Movie updated successfully!
                    </div>
                )}

                {error && (
                    <div className="error-message">{error}</div>
                )}

                {movie && (
                    <form onSubmit={handleSubmit} className="edit-form">
                        <div className="form-section">
                            <h3 className="section-title">Basic Information</h3>
                            
                            <div className="form-group">
                                <label htmlFor="title" className="form-label">
                                    Title <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                    minLength="2"
                                    maxLength="500"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="poster_path" className="form-label">
                                    Poster URL <span className="required">*</span>
                                </label>
                                <input
                                    type="url"
                                    id="poster_path"
                                    name="poster_path"
                                    className="form-input"
                                    value={formData.poster_path}
                                    onChange={handleInputChange}
                                    required
                                />
                                {formData.poster_path && (
                                    <img 
                                        src={formData.poster_path} 
                                        alt="Poster preview"
                                        className="poster-preview"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="youtube_id" className="form-label">
                                    YouTube ID <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="youtube_id"
                                    name="youtube_id"
                                    className="form-input"
                                    value={formData.youtube_id}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="section-title">Genres</h3>
                            <div className="form-group">
                                <div className="genre-grid">
                                    {genres.map((genre) => {
                                        const isSelected = formData.genre.some(g => g.genre_id === genre.genre_id);
                                        return (
                                            <button
                                                key={genre.genre_id}
                                                type="button"
                                                className={`genre-chip ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleGenreToggle(genre.genre_id, genre.genre_name)}
                                            >
                                                {isSelected && (
                                                    <FontAwesomeIcon icon={faCheck} className="check-icon" />
                                                )}
                                                {genre.genre_name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {formData.genre.length === 0 && (
                                    <p className="form-error">At least one genre is required</p>
                                )}
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="section-title">Review & Ranking</h3>
                            
                            <div className="form-group">
                                <label htmlFor="admin_review" className="form-label">
                                    Admin Review
                                </label>
                                <textarea
                                    id="admin_review"
                                    name="admin_review"
                                    className="form-textarea"
                                    rows="6"
                                    value={formData.admin_review}
                                    onChange={handleInputChange}
                                    placeholder="Enter admin review..."
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="ranking_value" className="form-label">
                                    Ranking
                                </label>
                                <select
                                    id="ranking_value"
                                    name="ranking_value"
                                    className="form-select"
                                    value={formData.ranking.ranking_value}
                                    onChange={handleRankingChange}
                                >
                                    <option value="1">Excellent</option>
                                    <option value="2">Good</option>
                                    <option value="3">Okay</option>
                                    <option value="4">Bad</option>
                                    <option value="5">Terrible</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => navigate('/admin/movies')}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="save-btn"
                                disabled={saving || formData.genre.length === 0}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faSave} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AdminMovieEdit;


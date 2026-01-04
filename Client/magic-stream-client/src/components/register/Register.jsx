import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../../assets/MagicStreamLogo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faCheck } from '@fortawesome/free-solid-svg-icons';
import './Auth.css';

const Register = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [favouriteGenres, setFavouriteGenres] = useState([]);
    const [genres, setGenres] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const response = await axiosClient.get('/genres');
                setGenres(response.data);
            } catch (error) {
                console.error('Error fetching movie genres:', error);
            }
        };
        fetchGenres();
    }, []);

    const handleGenreToggle = (genreId, genreName) => {
        setFavouriteGenres(prev => {
            const exists = prev.find(g => g.genre_id === genreId);
            if (exists) {
                return prev.filter(g => g.genre_id !== genreId);
            } else {
                return [...prev, { genre_id: genreId, genre_name: genreName }];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                first_name: firstName,
                last_name: lastName,
                email,
                password,
                role: "USER",
                favourite_genres: favouriteGenres
            };
            
            const response = await axiosClient.post('/register', payload);
            
            if (response.data.error) {
                setError(response.data.error);
                return;
            }
            
            navigate('/login', { 
                replace: true,
                state: { message: 'Registration successful! Please sign in.' }
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card auth-card-large">
                <div className="auth-header">
                    <img src={logo} alt="MagicStream Logo" className="auth-logo" />
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join MagicStream and start watching</p>
                </div>

                {error && (
                    <div className="alert-error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="firstName" className="form-label">
                                First Name
                            </label>
                            <input
                                id="firstName"
                                type="text"
                                className="form-input"
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="lastName" className="form-label">
                                Last Name
                            </label>
                            <input
                                id="lastName"
                                type="text"
                                className="form-input"
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Create a password (min. 6 characters)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            Confirm Password
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className={`form-input ${confirmPassword && password !== confirmPassword ? 'input-error' : ''}`}
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <span className="input-error-text">Passwords do not match</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Favorite Genres <span className="optional-label">(Optional)</span>
                        </label>
                        <div className="genre-grid">
                            {genres.map((genre) => {
                                const isSelected = favouriteGenres.some(g => g.genre_id === genre.genre_id);
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
                        <p className="form-helper-text">
                            Select genres to get personalized recommendations
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" role="status" aria-hidden="true"></span>
                                Creating account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <span className="footer-text">Already have an account? </span>
                    <Link to="/login" className="footer-link">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
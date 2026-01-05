import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import Spinner from '../spinner/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheck, 
    faStar, 
    faEnvelope, 
    faLock, 
    faCreditCard,
    faCrown,
    faShield,
    faTimes,
    faTrash,
    faFilm
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons';
import './Account.css';

const Account = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Preferences state
    const [genres, setGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);
    
    // Subscription state
    const [plans, setPlans] = useState([]);
    const [subscribing, setSubscribing] = useState(false);
    
    // Ratings state
    const [userRatings, setUserRatings] = useState([]);
    const [ratingLoading, setRatingLoading] = useState(false);
    
    // Security state
    const [resetToken, setResetToken] = useState('');
    const [resetPassword, setResetPassword] = useState({ token: '', newPassword: '', confirmPassword: '' });
    const [verificationToken, setVerificationToken] = useState('');
    const [verifying, setVerifying] = useState(false);
    
    const axiosPrivate = useAxiosPrivate();
    const { auth, setAuth } = useAuth();
    const navigate = useNavigate();

    // Fetch canonical profile
    const fetchMe = async () => {
        try {
            const response = await axiosPrivate.get('/me');
            setMe(response.data);
            
            // Update auth context with latest data
            if (auth) {
                setAuth({
                    ...auth,
                    favourite_genres: response.data.favourite_genres,
                    email_verified: response.data.email_verified,
                });
            }
            
            // Set selected genres for preferences
            setSelectedGenres(response.data.favourite_genres || []);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Failed to load profile');
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch profile
                await fetchMe();
                
                // Fetch genres for preferences
                const genresResponse = await axiosPrivate.get('/genres');
                setGenres(genresResponse.data);
                
                // Fetch plans
                const plansResponse = await axiosPrivate.get('/plans');
                setPlans(plansResponse.data || []);
            } catch (err) {
                console.error('Error loading account data:', err);
                setError('Failed to load account data');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [axiosPrivate]);

    // Handle genre toggle
    const handleGenreToggle = (genreId, genreName) => {
        setSelectedGenres(prev => {
            const exists = prev.find(g => g.genre_id === genreId);
            if (exists) {
                return prev.filter(g => g.genre_id !== genreId);
            } else {
                return [...prev, { genre_id: genreId, genre_name: genreName }];
            }
        });
    };

    // Save preferences
    const handleSavePreferences = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await axiosPrivate.put('/me/preferences', {
                favourite_genres: selectedGenres
            });
            setSuccess('Preferences updated successfully! Recommendations will update immediately.');
            await fetchMe(); // Refresh profile
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update preferences');
        } finally {
            setSaving(false);
        }
    };

    // Subscribe to plan
    const handleSubscribe = async (planId) => {
        setSubscribing(true);
        setError(null);
        setSuccess(null);
        try {
            await axiosPrivate.post('/subscribe', { plan_id: planId });
            setSuccess('Subscription activated successfully!');
            await fetchMe(); // Refresh profile
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to subscribe');
        } finally {
            setSubscribing(false);
        }
    };

    // Cancel subscription
    const handleCancelSubscription = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription? You can continue streaming until the current period ends.')) {
            return;
        }
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await axiosPrivate.post('/subscription/cancel');
            setSuccess(response.data.message || 'Subscription cancelled successfully');
            await fetchMe(); // Refresh profile
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to cancel subscription');
        } finally {
            setSaving(false);
        }
    };

    // Request password reset
    const handleForgotPassword = async () => {
        if (!me?.email) return;
        setError(null);
        setSuccess(null);
        try {
            const response = await axiosPrivate.post('/forgot-password', { email: me.email });
            setResetToken(response.data.token);
            setSuccess(`Password reset token (SIMULATION): ${response.data.token}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request password reset');
        }
    };

    // Reset password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (resetPassword.newPassword !== resetPassword.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (resetPassword.newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await axiosPrivate.post('/reset-password', {
                token: resetPassword.token,
                new_password: resetPassword.newPassword
            });
            setSuccess('Password reset successfully!');
            setResetPassword({ token: '', newPassword: '', confirmPassword: '' });
            setResetToken('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setSaving(false);
        }
    };

    // Request email verification
    const handleRequestVerification = async () => {
        setError(null);
        setSuccess(null);
        try {
            const response = await axiosPrivate.post('/verify-email/request');
            setVerificationToken(response.data.token);
            setSuccess(`Email verification token (SIMULATION): ${response.data.token}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request verification');
        }
    };

    // Confirm email verification
    const handleConfirmVerification = async () => {
        if (!verificationToken) {
            setError('Please request a verification token first');
            return;
        }
        setVerifying(true);
        setError(null);
        setSuccess(null);
        try {
            await axiosPrivate.post('/verify-email/confirm', { token: verificationToken });
            setSuccess('Email verified successfully!');
            setVerificationToken('');
            await fetchMe(); // Refresh profile
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to verify email');
        } finally {
            setVerifying(false);
        }
    };

    // Fetch user's ratings
    const fetchUserRatings = useCallback(async () => {
        setRatingLoading(true);
        try {
            const response = await axiosPrivate.get('/me/ratings');
            setUserRatings(response.data || []);
        } catch (err) {
            console.error('Error fetching ratings:', err);
        } finally {
            setRatingLoading(false);
        }
    }, [axiosPrivate]);

    // Fetch ratings when tab switches to ratings
    useEffect(() => {
        if (activeTab === 'ratings') {
            fetchUserRatings();
        }
    }, [activeTab, fetchUserRatings]);

    // Delete rating
    const handleDeleteRating = async (imdbId) => {
        if (!window.confirm('Delete this rating?')) return;
        
        try {
            await axiosPrivate.delete(`/ratings/${imdbId}`);
            setUserRatings(prev => prev.filter(r => r.imdb_id !== imdbId));
            setSuccess('Rating deleted successfully');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete rating');
        }
    };

    if (loading) {
        return (
            <div className="account-loading">
                <Spinner />
            </div>
        );
    }

    if (!me) {
        return (
            <div className="account-error">
                <p>Failed to load account information</p>
            </div>
        );
    }

    return (
        <div className="account-page">
            <div className="account-container">
                <div className="account-header">
                    <h1 className="account-title">Account Settings</h1>
                    <p className="account-subtitle">Manage your preferences, subscription, and security</p>
                </div>

                {error && (
                    <div className="alert-error" role="alert">
                        {error}
                        <button className="alert-close" onClick={() => setError(null)} aria-label="Close">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="alert-success" role="alert">
                        {success}
                        <button className="alert-close" onClick={() => setSuccess(null)} aria-label="Close">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="account-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <FontAwesomeIcon icon={faEnvelope} />
                        Profile
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preferences')}
                    >
                        <FontAwesomeIcon icon={faStar} />
                        Preferences
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
                        onClick={() => setActiveTab('subscription')}
                    >
                        <FontAwesomeIcon icon={faCreditCard} />
                        Subscription
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ratings')}
                    >
                        <FontAwesomeIcon icon={faStar} />
                        My Ratings
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <FontAwesomeIcon icon={faLock} />
                        Security
                    </button>
                </div>

                {/* Tab Content */}
                <div className="account-content">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="account-section">
                            <h2 className="section-title">Profile Information</h2>
                            <div className="profile-info">
                                <div className="info-row">
                                    <label>Name</label>
                                    <div>{me.first_name} {me.last_name}</div>
                                </div>
                                <div className="info-row">
                                    <label>Email</label>
                                    <div className="email-row">
                                        <span>{me.email}</span>
                                        {me.email_verified ? (
                                            <span className="verified-badge">
                                                <FontAwesomeIcon icon={faCheck} />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="unverified-badge">
                                                Not Verified
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="info-row">
                                    <label>Role</label>
                                    <div>{me.role}</div>
                                </div>
                                {me.subscription && (
                                    <div className="info-row">
                                        <label>Subscription</label>
                                        <div>
                                            {me.subscription.plan_name || me.subscription.plan_id} - {me.subscription.status}
                                            {me.subscription.expires_at && (
                                                <span className="expires-text">
                                                    {' '}(expires {new Date(me.subscription.expires_at).toLocaleDateString()})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <div className="account-section">
                            <h2 className="section-title">Favorite Genres</h2>
                            <p className="section-description">
                                Select your favorite genres to get personalized recommendations
                            </p>
                            <div className="genre-grid">
                                {genres.map((genre) => {
                                    const isSelected = selectedGenres.some(g => g.genre_id === genre.genre_id);
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
                            <button
                                className="btn-save"
                                onClick={handleSavePreferences}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </div>
                    )}

                    {/* Subscription Tab */}
                    {activeTab === 'subscription' && (
                        <div className="account-section">
                            <h2 className="section-title">Subscription</h2>
                            
                            {me.subscription?.can_stream ? (
                                <div className="subscription-details">
                                    <div className="subscription-card active">
                                        <div className="subscription-badge">
                                            <FontAwesomeIcon icon={faCrown} />
                                            {me.subscription.status}
                                        </div>
                                        <h3 className="subscription-plan-name">
                                            {me.subscription.plan_name || me.subscription.plan_id}
                                        </h3>
                                        <div className="subscription-info">
                                            <div className="info-item">
                                                <span className="label">Started</span>
                                                <span className="value">
                                                    {me.subscription.started_at ? new Date(me.subscription.started_at).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="info-item">
                                                <span className="label">Expires</span>
                                                <span className="value">
                                                    {me.subscription.expires_at ? new Date(me.subscription.expires_at).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="info-item">
                                                <span className="label">Next Billing</span>
                                                <span className="value">
                                                    {me.subscription.next_billing_at ? new Date(me.subscription.next_billing_at).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="info-item">
                                                <span className="label">Payment Method</span>
                                                <span className="value">
                                                    {me.subscription.payment_method || 'Card'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="subscription-actions">
                                            <button 
                                                className="btn-outline"
                                                onClick={() => navigate('/subscribe')}
                                            >
                                                Change Plan
                                            </button>
                                            <button 
                                                className="btn-danger"
                                                onClick={handleCancelSubscription}
                                                disabled={saving}
                                            >
                                                {saving ? 'Cancelling...' : 'Cancel Subscription'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-subscription">
                                    <div className="no-sub-icon">
                                        <FontAwesomeIcon icon={faCreditCard} />
                                    </div>
                                    <h3>No Active Subscription</h3>
                                    <p>Subscribe to start streaming unlimited movies</p>
                                    <button 
                                        className="btn-primary"
                                        onClick={() => navigate('/subscribe')}
                                    >
                                        View Plans
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ratings Tab */}
                    {activeTab === 'ratings' && (
                        <div className="account-section">
                            <h2 className="section-title">My Ratings & Reviews</h2>
                            <p className="section-description">Movies you've rated and reviewed</p>
                            
                            {ratingLoading ? (
                                <div className="ratings-loading">
                                    <Spinner />
                                </div>
                            ) : userRatings.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">
                                        <FontAwesomeIcon icon={faFilm} />
                                    </div>
                                    <p>You haven't rated any movies yet</p>
                                    <button className="btn-primary" onClick={() => navigate('/')}>
                                        Browse Movies
                                    </button>
                                </div>
                            ) : (
                                <div className="ratings-list">
                                    {userRatings.map((rating) => (
                                        <div key={rating.imdb_id} className="rating-card">
                                            {rating.movie_poster ? (
                                                <img 
                                                    src={rating.movie_poster} 
                                                    alt={rating.movie_title || rating.imdb_id}
                                                    className="rating-poster"
                                                />
                                            ) : (
                                                <div className="rating-poster-placeholder">
                                                    <FontAwesomeIcon icon={faFilm} />
                                                </div>
                                            )}
                                            <div className="rating-info">
                                                <h4 className="rating-movie-title">
                                                    {rating.movie_title || rating.imdb_id}
                                                </h4>
                                                <p className="rating-imdb-id">{rating.imdb_id}</p>
                                                <div className="rating-stars">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FontAwesomeIcon
                                                            key={i}
                                                            icon={i < rating.rating ? faStar : faStarOutline}
                                                            className={i < rating.rating ? 'filled' : 'empty'}
                                                        />
                                                    ))}
                                                    <span className="rating-value">{rating.rating}/5</span>
                                                </div>
                                                {rating.review_text && (
                                                    <p className="rating-review-text">{rating.review_text}</p>
                                                )}
                                                <span className="rating-date">
                                                    {new Date(rating.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <button 
                                                className="btn-delete-rating"
                                                onClick={() => handleDeleteRating(rating.imdb_id)}
                                                aria-label="Delete rating"
                                                title="Delete rating"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="account-section">
                            <h2 className="section-title">Security</h2>
                            
                            {/* Email Verification */}
                            <div className="security-section">
                                <h3 className="subsection-title">Email Verification</h3>
                                {me.email_verified ? (
                                    <div className="verified-status">
                                        <FontAwesomeIcon icon={faCheck} className="status-icon verified" />
                                        <span>Your email is verified</span>
                                    </div>
                                ) : (
                                    <div className="verification-flow">
                                        <button
                                            className="btn-outline"
                                            onClick={handleRequestVerification}
                                        >
                                            Request Verification Token
                                        </button>
                                        {verificationToken && (
                                            <div className="token-display">
                                                <p>Token: <code>{verificationToken}</code></p>
                                                <button
                                                    className="btn-primary"
                                                    onClick={handleConfirmVerification}
                                                    disabled={verifying}
                                                >
                                                    {verifying ? 'Verifying...' : 'Verify Email'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Password Reset */}
                            <div className="security-section">
                                <h3 className="subsection-title">Password Reset</h3>
                                {!resetToken ? (
                                    <button
                                        className="btn-outline"
                                        onClick={handleForgotPassword}
                                    >
                                        Request Password Reset Token
                                    </button>
                                ) : (
                                    <form onSubmit={handleResetPassword} className="reset-form">
                                        <div className="form-group">
                                            <label>Reset Token</label>
                                            <input
                                                type="text"
                                                value={resetPassword.token}
                                                onChange={(e) => setResetPassword({...resetPassword, token: e.target.value})}
                                                placeholder="Enter reset token"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>New Password</label>
                                            <input
                                                type="password"
                                                value={resetPassword.newPassword}
                                                onChange={(e) => setResetPassword({...resetPassword, newPassword: e.target.value})}
                                                placeholder="Min. 6 characters"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Confirm Password</label>
                                            <input
                                                type="password"
                                                value={resetPassword.confirmPassword}
                                                onChange={(e) => setResetPassword({...resetPassword, confirmPassword: e.target.value})}
                                                placeholder="Re-enter password"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            disabled={saving}
                                        >
                                            {saving ? 'Resetting...' : 'Reset Password'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Account;


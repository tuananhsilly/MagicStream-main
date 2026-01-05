import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faLock, 
    faCrown, 
    faArrowRight, 
    faPlay,
    faCheck,
    faTv,
    faDesktop
} from '@fortawesome/free-solid-svg-icons';
import './StreamMovie.css';

const StreamMovie = () => {
    const params = useParams();
    const key = params.yt_id;
    const [canStream, setCanStream] = useState(false);
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState([]);
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const [meResponse, plansResponse] = await Promise.all([
                    axiosPrivate.get('/me'),
                    axiosPrivate.get('/plans')
                ]);
                const subscription = meResponse.data.subscription;
                setCanStream(subscription?.can_stream || false);
                setPlans(plansResponse.data || []);
            } catch (err) {
                console.error('Error checking subscription:', err);
                setCanStream(false);
            } finally {
                setLoading(false);
            }
        };
        checkSubscription();
    }, [axiosPrivate]);

    if (loading) {
        return (
            <div className="stream-container">
                <div className="stream-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!canStream) {
        return (
            <div className="stream-container paywall-mode">
                {/* Blurred background teaser */}
                <div className="paywall-teaser">
                    <div className="teaser-overlay">
                        <FontAwesomeIcon icon={faPlay} className="teaser-play-icon" />
                    </div>
                </div>
                
                <div className="paywall">
                    <div className="paywall-content">
                        <div className="paywall-icon">
                            <FontAwesomeIcon icon={faLock} />
                        </div>
                        <h2 className="paywall-title">Start Watching Now</h2>
                        <p className="paywall-description">
                            Subscribe to unlock unlimited streaming of this movie and thousands more
                        </p>

                        {/* Quick Plan Cards */}
                        <div className="paywall-plans">
                            {plans.slice(0, 3).map((plan) => (
                                <div 
                                    key={plan.plan_id} 
                                    className={`paywall-plan-card ${plan.is_popular ? 'popular' : ''}`}
                                >
                                    {plan.is_popular && <span className="mini-badge">Popular</span>}
                                    <h4>{plan.name}</h4>
                                    <p className="plan-quick-price">
                                        ${plan.price_monthly?.toFixed(2) || '0.00'}/mo
                                    </p>
                                    <div className="plan-quick-features">
                                        <span><FontAwesomeIcon icon={faTv} /> {plan.max_quality}</span>
                                        <span><FontAwesomeIcon icon={faDesktop} /> {plan.max_streams} {plan.max_streams === 1 ? 'screen' : 'screens'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            className="paywall-btn primary"
                            onClick={() => navigate('/subscribe')}
                        >
                            <FontAwesomeIcon icon={faCrown} />
                            Subscribe Now
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>

                        <button
                            className="paywall-btn secondary"
                            onClick={() => navigate('/')}
                        >
                            Browse Free Content
                        </button>

                        <p className="paywall-note">
                            Cancel anytime. No commitment required.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="stream-container">
            <div className="player-wrapper">
                {key ? (
                    <ReactPlayer
                        url={`https://www.youtube.com/watch?v=${key}`}
                        controls
                        playing
                        width="100%"
                        height="100%"
                        className="react-player"
                        config={{
                            youtube: {
                                playerVars: { modestbranding: 1 }
                            }
                        }}
                    />
                ) : (
                    <div className="error-state">
                        <p>No video available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StreamMovie;
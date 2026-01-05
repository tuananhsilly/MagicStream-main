import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import Spinner from '../spinner/Spinner';
import CheckoutModal from './CheckoutModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheck, 
    faCrown, 
    faTv,
    faDesktop,
    faMobileScreen,
    faDownload,
    faBan,
    faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import './SubscriptionPage.css';

const SubscriptionPage = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState(null);

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch plans
                const plansResponse = await axiosPrivate.get('/plans');
                setPlans(plansResponse.data || []);

                // Fetch current subscription
                const subResponse = await axiosPrivate.get('/subscription');
                setCurrentSubscription(subResponse.data?.subscription || null);
            } catch (err) {
                console.error('Error fetching subscription data:', err);
                setError('Failed to load subscription plans');
            } finally {
                setLoading(false);
            }
        };

        if (auth) {
            fetchData();
        } else {
            navigate('/login');
        }
    }, [axiosPrivate, auth, navigate]);

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setShowCheckout(true);
    };

    const handleCheckoutSuccess = () => {
        setShowCheckout(false);
        setSelectedPlan(null);
        // Navigate to stream or account
        navigate('/account');
    };

    const handleCheckoutClose = () => {
        setShowCheckout(false);
        setSelectedPlan(null);
    };

    const getFeatureIcon = (feature) => {
        const lowerFeature = feature.toLowerCase();
        if (lowerFeature.includes('device') || lowerFeature.includes('screen')) return faDesktop;
        if (lowerFeature.includes('tv')) return faTv;
        if (lowerFeature.includes('mobile')) return faMobileScreen;
        if (lowerFeature.includes('download')) return faDownload;
        if (lowerFeature.includes('no ads') || lowerFeature.includes('ad-free')) return faBan;
        return faCheck;
    };

    if (loading) {
        return (
            <div className="subscription-page">
                <div className="subscription-loading">
                    <Spinner />
                </div>
            </div>
        );
    }

    return (
        <div className="subscription-page">
            <div className="subscription-container">
                {/* Header */}
                <div className="subscription-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Back
                    </button>
                    <h1 className="subscription-title">Choose Your Plan</h1>
                    <p className="subscription-subtitle">
                        Unlock unlimited streaming with a plan that fits your needs
                    </p>
                </div>

                {error && (
                    <div className="subscription-error">
                        <p>{error}</p>
                    </div>
                )}

                {/* Current Subscription Banner */}
                {currentSubscription && currentSubscription.can_stream && (
                    <div className="current-plan-banner">
                        <FontAwesomeIcon icon={faCrown} className="banner-icon" />
                        <div className="banner-content">
                            <span className="banner-label">Current Plan</span>
                            <span className="banner-plan">{currentSubscription.plan?.name || currentSubscription.plan_id}</span>
                        </div>
                        <span className="banner-status active">ACTIVE</span>
                    </div>
                )}

                {/* Plans Grid */}
                <div className="plans-container">
                    {plans.map((plan) => {
                        const isCurrentPlan = currentSubscription?.plan_id === plan.plan_id;
                        return (
                            <div 
                                key={plan.plan_id} 
                                className={`plan-card ${plan.is_popular ? 'popular' : ''} ${isCurrentPlan ? 'current' : ''}`}
                            >
                                {plan.is_popular && (
                                    <div className="popular-badge">
                                        <FontAwesomeIcon icon={faCrown} />
                                        Most Popular
                                    </div>
                                )}
                                
                                <div className="plan-header">
                                    <h2 className="plan-name">{plan.name}</h2>
                                    <div className="plan-price">
                                        <span className="currency">$</span>
                                        <span className="amount">{plan.price_monthly?.toFixed(2) || '0.00'}</span>
                                        <span className="period">/month</span>
                                    </div>
                                </div>

                                <div className="plan-quality">
                                    <span className="quality-badge">{plan.max_quality}</span>
                                    <span className="streams-info">{plan.max_streams} {plan.max_streams === 1 ? 'Stream' : 'Streams'}</span>
                                </div>

                                <ul className="plan-features">
                                    {(plan.features || []).map((feature, index) => (
                                        <li key={index} className="feature-item">
                                            <FontAwesomeIcon icon={getFeatureIcon(feature)} className="feature-icon" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`plan-cta ${isCurrentPlan ? 'current-plan-btn' : ''}`}
                                    onClick={() => !isCurrentPlan && handleSelectPlan(plan)}
                                    disabled={isCurrentPlan}
                                >
                                    {isCurrentPlan ? 'Current Plan' : 'Choose Plan'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {plans.length === 0 && !loading && (
                    <div className="no-plans">
                        <p>No subscription plans available at the moment.</p>
                    </div>
                )}

                {/* Features Comparison */}
                <div className="features-section">
                    <h3 className="features-title">Why Subscribe?</h3>
                    <div className="features-grid">
                        <div className="feature-box">
                            <FontAwesomeIcon icon={faTv} className="feature-box-icon" />
                            <h4>Unlimited Streaming</h4>
                            <p>Watch as many movies as you want, anytime</p>
                        </div>
                        <div className="feature-box">
                            <FontAwesomeIcon icon={faDesktop} className="feature-box-icon" />
                            <h4>Multiple Devices</h4>
                            <p>Stream on TV, mobile, tablet, and more</p>
                        </div>
                        <div className="feature-box">
                            <FontAwesomeIcon icon={faBan} className="feature-box-icon" />
                            <h4>No Commitments</h4>
                            <p>Cancel anytime, no questions asked</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && selectedPlan && (
                <CheckoutModal
                    plan={selectedPlan}
                    onSuccess={handleCheckoutSuccess}
                    onClose={handleCheckoutClose}
                />
            )}
        </div>
    );
};

export default SubscriptionPage;


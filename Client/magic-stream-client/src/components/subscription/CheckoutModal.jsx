import { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, 
    faCreditCard,
    faLock,
    faCheck,
    faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { faPaypal, faCcVisa, faCcMastercard, faCcAmex } from '@fortawesome/free-brands-svg-icons';
import './CheckoutModal.css';

const CheckoutModal = ({ plan, onSuccess, onClose }) => {
    const [paymentMethod, setPaymentMethod] = useState('CARD');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardName, setCardName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const axiosPrivate = useAxiosPrivate();

    // Format card number with spaces
    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : value;
    };

    // Format expiry date
    const formatExpiry = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    // Detect card type
    const getCardType = () => {
        const number = cardNumber.replace(/\s/g, '');
        if (number.startsWith('4')) return 'visa';
        if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
        if (number.startsWith('3')) return 'amex';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Basic validation
        if (paymentMethod === 'CARD') {
            const cardNum = cardNumber.replace(/\s/g, '');
            if (cardNum.length < 13 || cardNum.length > 19) {
                setError('Please enter a valid card number');
                return;
            }
            if (!cardExpiry || cardExpiry.length < 5) {
                setError('Please enter a valid expiry date');
                return;
            }
            if (!cardCvv || cardCvv.length < 3) {
                setError('Please enter a valid CVV');
                return;
            }
        }

        setProcessing(true);

        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const response = await axiosPrivate.post('/subscribe', {
                plan_id: plan.plan_id,
                payment_method: paymentMethod,
                card_number: cardNumber.replace(/\s/g, '').slice(-4) // Only send last 4 digits
            });

            if (response.data) {
                setSuccess(true);
                // Wait for success animation
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError(err.response?.data?.error || 'Payment failed. Please try again.');
            setProcessing(false);
        }
    };

    if (success) {
        return (
            <div className="checkout-overlay">
                <div className="checkout-modal success-modal">
                    <div className="success-content">
                        <div className="success-icon">
                            <FontAwesomeIcon icon={faCheck} />
                        </div>
                        <h2>Payment Successful!</h2>
                        <p>Welcome to {plan.name}. Enjoy unlimited streaming!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-overlay" onClick={onClose}>
            <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose} disabled={processing}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                <div className="checkout-header">
                    <h2>Complete Your Purchase</h2>
                    <div className="plan-summary">
                        <span className="plan-name">{plan.name}</span>
                        <span className="plan-price">${plan.price_monthly?.toFixed(2)}/month</span>
                    </div>
                </div>

                {error && (
                    <div className="checkout-error">
                        <p>{error}</p>
                    </div>
                )}

                {/* Payment Method Tabs */}
                <div className="payment-methods">
                    <button
                        type="button"
                        className={`method-tab ${paymentMethod === 'CARD' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('CARD')}
                        disabled={processing}
                    >
                        <FontAwesomeIcon icon={faCreditCard} />
                        Credit Card
                    </button>
                    <button
                        type="button"
                        className={`method-tab ${paymentMethod === 'PAYPAL' ? 'active' : ''}`}
                        onClick={() => setPaymentMethod('PAYPAL')}
                        disabled={processing}
                    >
                        <FontAwesomeIcon icon={faPaypal} />
                        PayPal
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="checkout-form">
                    {paymentMethod === 'CARD' ? (
                        <>
                            <div className="form-group">
                                <label>Cardholder Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                    disabled={processing}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Card Number</label>
                                <div className="card-input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="4242 4242 4242 4242"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        maxLength={19}
                                        disabled={processing}
                                        required
                                    />
                                    <div className="card-icons">
                                        {getCardType() === 'visa' && <FontAwesomeIcon icon={faCcVisa} className="card-brand active" />}
                                        {getCardType() === 'mastercard' && <FontAwesomeIcon icon={faCcMastercard} className="card-brand active" />}
                                        {getCardType() === 'amex' && <FontAwesomeIcon icon={faCcAmex} className="card-brand active" />}
                                        {!getCardType() && (
                                            <>
                                                <FontAwesomeIcon icon={faCcVisa} className="card-brand" />
                                                <FontAwesomeIcon icon={faCcMastercard} className="card-brand" />
                                                <FontAwesomeIcon icon={faCcAmex} className="card-brand" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        value={cardExpiry}
                                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                        maxLength={5}
                                        disabled={processing}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input
                                        type="text"
                                        placeholder="123"
                                        value={cardCvv}
                                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                        disabled={processing}
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="paypal-section">
                            <div className="paypal-info">
                                <FontAwesomeIcon icon={faPaypal} className="paypal-icon" />
                                <p>You will be redirected to PayPal to complete your payment (Simulated)</p>
                            </div>
                        </div>
                    )}

                    <div className="checkout-footer">
                        <div className="secure-badge">
                            <FontAwesomeIcon icon={faLock} />
                            <span>Secure Payment</span>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="pay-btn"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    Processing...
                                </>
                            ) : (
                                <>Pay ${plan.price_monthly?.toFixed(2)}</>
                            )}
                        </button>

                        <p className="terms-text">
                            By subscribing, you agree to our Terms of Service. 
                            Your subscription will auto-renew monthly.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutModal;


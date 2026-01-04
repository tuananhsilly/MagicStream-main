import './Spinner.css';
import logo from '../../assets/MagicStreamLogo.png';

const Spinner = () => {
    return (
        <div className="spinner-container">
            <div className="spinner-content">
                <div className="spinner-logo-wrapper">
                    <img src={logo} alt="Loading" className="spinner-logo" />
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring-delay"></div>
                </div>
                <p className="spinner-text">Loading content...</p>
            </div>
        </div>
    );
};

export default Spinner;
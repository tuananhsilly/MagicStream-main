// Enhanced Header with glassmorphism and better UX
import {useState} from 'react'
import {useNavigate, NavLink} from 'react-router-dom'
import useAuth from '../../hooks/useAuth';
import logo from '../../assets/MagicStreamLogo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import './Header.css';

const Header = ({handleLogout}) => {
    const navigate = useNavigate();
    const {auth} = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="header-glass">
            <div className="header-container">
                <div className="header-brand" onClick={() => navigate('/')}>
                    <img src={logo} alt="MagicStream Logo" className="header-logo" />
                    <span className="header-title">MagicStream</span>
                </div>

                {/* Desktop Navigation - Enhanced with Icons */}
                <nav className="header-nav">
                    <NavLink 
                        to="/" 
                        className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
                        end
                    >
                        <FontAwesomeIcon icon={faHome} className="nav-icon" />
                        <span>Home</span>
                    </NavLink>
                    {auth && (
                        <>
                            {auth.role === 'ADMIN' && (
                                <NavLink 
                                    to="/admin" 
                                    className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <FontAwesomeIcon icon={faShieldHalved} className="nav-icon" />
                                    <span>Admin</span>
                                </NavLink>
                            )}
                        </>
                    )}
                </nav>

                {/* Auth Section */}
                <div className="header-auth">
                    {auth ? (
                        <>
                            <span 
                                className="user-greeting clickable"
                                onClick={() => navigate('/account')}
                                style={{ cursor: 'pointer' }}
                                title="Go to Account Settings"
                            >
                                Hi, <strong>{auth.first_name}</strong>
                            </span>
                            <button 
                                className="btn-outline"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="btn-outline"
                                onClick={() => navigate("/login")}
                            >
                                Login
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => navigate("/register")}
                            >
                                Sign Up
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button 
                    className="mobile-menu-btn"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
                </button>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="mobile-menu">
                    <NavLink to="/" onClick={() => setIsMenuOpen(false)} className="mobile-nav-link">
                        <FontAwesomeIcon icon={faHome} className="nav-icon" />
                        Home
                    </NavLink>
                    {auth && (
                        <>
                            {auth.role === 'ADMIN' && (
                                <NavLink to="/admin" onClick={() => setIsMenuOpen(false)} className="mobile-nav-link">
                                    <FontAwesomeIcon icon={faShieldHalved} className="nav-icon" />
                                    Admin
                                </NavLink>
                            )}
                        </>
                    )}
                </div>
            )}
        </header>
    )
}

export default Header;
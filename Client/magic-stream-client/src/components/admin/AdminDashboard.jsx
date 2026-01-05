import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faStar, faHome } from '@fortawesome/free-solid-svg-icons';
import './AdminDashboard.css';

const AdminDashboard = () => {
    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard-container">
                <div className="admin-header">
                    <h1 className="admin-title">Admin Dashboard</h1>
                    <Link to="/" className="back-to-site-btn">
                        <FontAwesomeIcon icon={faHome} />
                        Back to Site
                    </Link>
                </div>

                <div className="admin-nav">
                    <Link to="/admin/movies" className="admin-nav-card">
                        <div className="admin-nav-icon">
                            <FontAwesomeIcon icon={faFilm} />
                        </div>
                        <h3>Movies</h3>
                        <p>Manage movie catalog and metadata</p>
                    </Link>

                    <Link to="/admin/reviews" className="admin-nav-card">
                        <div className="admin-nav-icon">
                            <FontAwesomeIcon icon={faStar} />
                        </div>
                        <h3>Reviews & Ranking</h3>
                        <p>Update admin reviews and AI rankings</p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;


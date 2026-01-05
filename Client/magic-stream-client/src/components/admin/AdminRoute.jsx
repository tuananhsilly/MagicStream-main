import { useLocation, Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Spinner from '../spinner/Spinner';
import './AdminRoute.css';

const AdminRoute = () => {
    const { auth, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <Spinner />;
    }

    // Check if user is authenticated and has ADMIN role
    if (!auth) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (auth.role !== 'ADMIN') {
        return (
            <div className="unauthorized-container">
                <div className="unauthorized-content">
                    <h2>403 - Access Forbidden</h2>
                    <p>You do not have permission to access this page.</p>
                    <button onClick={() => window.location.href = '/'}>
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default AdminRoute;


import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faHome, faUsers, faBookmark, faCreditCard, faDollarSign, faUserShield, faChartLine, faStar } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Spinner from '../spinner/Spinner';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const axiosPrivate = useAxiosPrivate();
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);

    const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
    const usdFormatter = useMemo(
        () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
        []
    );

    useEffect(() => {
        let isMounted = true;

        const fetchStats = async () => {
            setStatsLoading(true);
            setStatsError(null);
            try {
                const res = await axiosPrivate.get('/admin/stats');
                if (!isMounted) return;
                setStats(res.data);
            } catch (err) {
                console.error('Error fetching admin stats:', err);
                if (!isMounted) return;
                setStatsError(err.response?.data?.error || 'Failed to load dashboard stats');
                setStats(null);
            } finally {
                if (isMounted) setStatsLoading(false);
            }
        };

        fetchStats();
        return () => {
            isMounted = false;
        };
    }, [axiosPrivate]);

    const hasStats = Boolean(stats && typeof stats === 'object');

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

                <div className="admin-stats-section">
                    <div className="admin-stats-header">
                        <h2 className="admin-stats-title">Statistics Overview</h2>
                        {hasStats && stats.generated_at && (
                            <span className="admin-stats-updated">
                                Updated {new Date(stats.generated_at).toLocaleString()}
                            </span>
                        )}
                    </div>

                    {statsError && (
                        <div className="admin-stats-error" role="alert">
                            {statsError}
                        </div>
                    )}

                    {statsLoading ? (
                        <div className="admin-stats-loading">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card">
                                <div className="admin-stat-icon">
                                    <FontAwesomeIcon icon={faFilm} />
                                </div>
                                <div className="admin-stat-meta">
                                    <div className="admin-stat-label">Total Movies</div>
                                    <div className="admin-stat-value">
                                        {hasStats ? numberFormatter.format(stats.total_movies ?? 0) : '—'}
                                    </div>
                                </div>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-icon">
                                    <FontAwesomeIcon icon={faUsers} />
                                </div>
                                <div className="admin-stat-meta">
                                    <div className="admin-stat-label">Total Users</div>
                                    <div className="admin-stat-value">
                                        {hasStats ? numberFormatter.format(stats.total_users ?? 0) : '—'}
                                    </div>
                                </div>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-icon">
                                    <FontAwesomeIcon icon={faCreditCard} />
                                </div>
                                <div className="admin-stat-meta">
                                    <div className="admin-stat-label">Active Subscriptions</div>
                                    <div className="admin-stat-value">
                                        {hasStats ? numberFormatter.format(stats.active_subscriptions ?? 0) : '—'}
                                    </div>
                                </div>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-icon">
                                    <FontAwesomeIcon icon={faStar} />
                                </div>
                                <div className="admin-stat-meta">
                                    <div className="admin-stat-label">Total Ratings</div>
                                    <div className="admin-stat-value">
                                        {hasStats ? numberFormatter.format(stats.total_ratings ?? 0) : '—'}
                                    </div>
                                </div>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-icon">
                                    <FontAwesomeIcon icon={faBookmark} />
                                </div>
                                <div className="admin-stat-meta">
                                    <div className="admin-stat-label">Total Watchlists</div>
                                    <div className="admin-stat-value">
                                        {hasStats ? numberFormatter.format(stats.total_watchlist_items ?? 0) : '—'}
                                    </div>
                                </div>
                            </div>

                            <div className="admin-stat-card">
                                <div className="admin-stat-icon">
                                    <FontAwesomeIcon icon={faDollarSign} />
                                </div>
                                <div className="admin-stat-meta">
                                    <div className="admin-stat-label">Revenue</div>
                                    <div className="admin-stat-value">
                                        {hasStats ? usdFormatter.format(stats.revenue?.amount ?? 0) : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="admin-nav">
                    <Link to="/admin/users" className="admin-nav-card">
                        <div className="admin-nav-icon">
                            <FontAwesomeIcon icon={faUserShield} />
                        </div>
                        <h3>Users & Accounts</h3>
                        <p>Manage users, roles, and subscriptions</p>
                    </Link>

                    <Link to="/admin/subscriptions" className="admin-nav-card">
                        <div className="admin-nav-icon">
                            <FontAwesomeIcon icon={faChartLine} />
                        </div>
                        <h3>Subscriptions & Revenue</h3>
                        <p>Manage subscriptions, payments, and analytics</p>
                    </Link>

                    <Link to="/admin/movies" className="admin-nav-card">
                        <div className="admin-nav-icon">
                            <FontAwesomeIcon icon={faFilm} />
                        </div>
                        <h3>Movies</h3>
                        <p>Manage movie catalog and metadata</p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;


import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheck,
    faCircleInfo,
    faEnvelope,
    faShieldHalved,
    faTriangleExclamation,
    faUser,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Spinner from '../spinner/Spinner';
import './AdminUserDetail.css';

const AdminUserDetail = () => {
    const { user_id } = useParams();
    const navigate = useNavigate();
    const axiosPrivate = useAxiosPrivate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [user, setUser] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [activity, setActivity] = useState(null);

    const [newRole, setNewRole] = useState('');

    const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

    const fetchUser = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axiosPrivate.get(`/admin/users/${user_id}`);
            setUser(res.data?.user || null);
            setSubscription(res.data?.subscription || null);
            setActivity(res.data?.activity || null);
            const currentRole = res.data?.user?.role || '';
            setNewRole(currentRole);
        } catch (err) {
            console.error('Error fetching user:', err);
            setError(err.response?.data?.error || 'Failed to load user');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user_id) return;
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user_id]);

    const handleSaveRole = async () => {
        if (!user || !newRole || newRole === user.role) return;
        if (!window.confirm(`Change role for ${user.email} to ${newRole}?`)) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await axiosPrivate.patch(`/admin/users/${user_id}/role`, { role: newRole });
            setSuccess('User role updated successfully');
            await fetchUser();
            setTimeout(() => setSuccess(null), 2500);
        } catch (err) {
            console.error('Error updating role:', err);
            setError(err.response?.data?.error || 'Failed to update role');
        } finally {
            setSaving(false);
        }
    };

    const getSubscriptionBadgeClass = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'sub-badge active';
            case 'CANCELED':
                return 'sub-badge canceled';
            case 'EXPIRED':
                return 'sub-badge expired';
            case 'NONE':
            default:
                return 'sub-badge none';
        }
    };

    if (loading) {
        return (
            <div className="admin-page-loading">
                <Spinner />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="admin-user-detail">
                <div className="admin-user-detail-container">
                    <div className="detail-header">
                        <button className="back-button" onClick={() => navigate('/admin/users')}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Back to Users
                        </button>
                        <h1 className="detail-title">User Details</h1>
                    </div>
                    <div className="error-state">
                        <p className="error-message">{error || 'User not found'}</p>
                        <Link className="back-link" to="/admin/users">
                            Return to Users
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const currentRole = user.role || '';
    const subscriptionStatus = subscription?.status || 'NONE';

    return (
        <div className="admin-user-detail">
            <div className="admin-user-detail-container">
                <div className="detail-header">
                    <button className="back-button" onClick={() => navigate('/admin/users')}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        Back to Users
                    </button>
                    <h1 className="detail-title">User Details</h1>
                </div>

                {error && (
                    <div className="alert alert-error" role="alert">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success" role="alert">
                        <FontAwesomeIcon icon={faCheck} />
                        <span>{success}</span>
                    </div>
                )}

                <div className="detail-grid">
                    <div className="detail-card">
                        <div className="card-title">
                            <FontAwesomeIcon icon={faUser} />
                            Profile
                        </div>
                        <div className="kv">
                            <div className="kv-row">
                                <span className="kv-label">Name</span>
                                <span className="kv-value">
                                    {user.first_name} {user.last_name}
                                </span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">
                                    <FontAwesomeIcon icon={faEnvelope} /> Email
                                </span>
                                <span className="kv-value">{user.email}</span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">User ID</span>
                                <span className="kv-value mono">{user.user_id}</span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">Email Verified</span>
                                <span className="kv-value">{user.email_verified ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">Created</span>
                                <span className="kv-value">
                                    {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-card">
                        <div className="card-title">
                            <FontAwesomeIcon icon={faCircleInfo} />
                            Subscription
                        </div>
                        <div className="kv">
                            <div className="kv-row">
                                <span className="kv-label">Status</span>
                                <span className="kv-value">
                                    <span className={getSubscriptionBadgeClass(subscriptionStatus)}>
                                        {subscriptionStatus}
                                    </span>
                                </span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">Plan</span>
                                <span className="kv-value">
                                    {subscription?.plan_name || subscription?.plan_id || '—'}
                                </span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">Expires</span>
                                <span className="kv-value">
                                    {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleString() : '—'}
                                </span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">Can Stream</span>
                                <span className="kv-value">{subscription?.can_stream ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-card">
                        <div className="card-title">
                            <FontAwesomeIcon icon={faCircleInfo} />
                            Activity
                        </div>
                        <div className="kv">
                            <div className="kv-row">
                                <span className="kv-label">Ratings</span>
                                <span className="kv-value">
                                    {numberFormatter.format(activity?.ratings_count ?? 0)}
                                </span>
                            </div>
                            <div className="kv-row">
                                <span className="kv-label">Watchlist</span>
                                <span className="kv-value">
                                    {numberFormatter.format(activity?.watchlist_count ?? 0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-card">
                        <div className="card-title">
                            <FontAwesomeIcon icon={faShieldHalved} />
                            Role Management
                        </div>
                        <p className="card-hint">
                            Change this user’s role between <strong>USER</strong> and <strong>ADMIN</strong>.
                        </p>
                        <div className="role-form">
                            <div className="role-row">
                                <label className="role-label">Current</label>
                                <span className={`role-pill ${currentRole === 'ADMIN' ? 'admin' : 'user'}`}>
                                    {currentRole || '—'}
                                </span>
                            </div>
                            <div className="role-row">
                                <label className="role-label">New role</label>
                                <select
                                    className="role-select"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    disabled={saving}
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <button
                                className="role-save-btn"
                                onClick={handleSaveRole}
                                disabled={saving || !newRole || newRole === currentRole}
                            >
                                {saving ? 'Saving…' : 'Save Role'}
                            </button>
                        </div>
                        <div className="note">
                            <FontAwesomeIcon icon={faCircleInfo} />
                            Self-role changes are blocked server-side for safety.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUserDetail;



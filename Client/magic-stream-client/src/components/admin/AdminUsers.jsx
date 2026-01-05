import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSearch, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Spinner from '../spinner/Spinner';
import './AdminUsers.css';

const AdminUsers = () => {
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [subscriptionFilter, setSubscriptionFilter] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page,
                    limit: pageSize,
                };
                if (searchQuery.trim()) params.q = searchQuery.trim();
                if (roleFilter) params.role = roleFilter;
                if (subscriptionFilter) params.subscription = subscriptionFilter;

                const res = await axiosPrivate.get('/admin/users', {
                    params,
                    signal: controller.signal,
                });

                if (!isMounted) return;
                setUsers(res.data?.items || []);
                setTotalItems(res.data?.total ?? 0);
                setTotalPages(res.data?.totalPages ?? 0);
            } catch (err) {
                // Ignore abort errors
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error('Error fetching users:', err);
                if (!isMounted) return;
                setError(err.response?.data?.error || 'Failed to load users');
                setUsers([]);
                setTotalItems(0);
                setTotalPages(0);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Small debounce for search typing
        const t = setTimeout(fetchUsers, 250);
        return () => {
            isMounted = false;
            controller.abort();
            clearTimeout(t);
        };
    }, [axiosPrivate, page, pageSize, searchQuery, roleFilter, subscriptionFilter]);

    const getRoleBadgeClass = (role) => {
        if (role === 'ADMIN') return 'role-badge admin';
        if (role === 'USER') return 'role-badge user';
        return 'role-badge';
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

    return (
        <div className="admin-users">
            <div className="admin-users-container">
                <div className="admin-users-header">
                    <div>
                        <h1 className="admin-users-title">Users & Accounts</h1>
                        <p className="admin-users-subtitle">
                            Showing {numberFormatter.format(users.length)} of {numberFormatter.format(totalItems)} users
                        </p>
                    </div>
                    <Link to="/admin" className="back-btn">
                        <FontAwesomeIcon icon={faHome} />
                        Dashboard
                    </Link>
                </div>

                <div className="admin-users-filters">
                    <div className="search-wrapper">
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by email..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="filters-row">
                        <div className="filter-group">
                            <label className="filter-label">Role</label>
                            <select
                                className="filter-select"
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="USER">USER</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Subscription</label>
                            <select
                                className="filter-select"
                                value={subscriptionFilter}
                                onChange={(e) => {
                                    setSubscriptionFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="CANCELED">CANCELED</option>
                                <option value="EXPIRED">EXPIRED</option>
                                <option value="NONE">NONE</option>
                            </select>
                        </div>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="admin-users-table-wrapper">
                    <table className="admin-users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Subscription</th>
                                <th>Ratings</th>
                                <th>Watchlist</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-state">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.user_id}>
                                        <td className="user-cell">
                                            <div className="user-cell-content">
                                                <div className="user-avatar">
                                                    <FontAwesomeIcon icon={faUser} />
                                                </div>
                                                <div className="user-meta">
                                                    <div className="user-name">
                                                        {u.first_name} {u.last_name}
                                                    </div>
                                                    <div className="user-id">{u.user_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="email-cell">{u.email}</td>
                                        <td>
                                            <span className={getRoleBadgeClass(u.role)}>{u.role}</span>
                                        </td>
                                        <td>
                                            <div className="sub-cell">
                                                <span className={getSubscriptionBadgeClass(u.subscription?.status)}>
                                                    {u.subscription?.status || 'NONE'}
                                                </span>
                                                {u.subscription?.plan_name && (
                                                    <span className="sub-plan">{u.subscription.plan_name}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="count-cell">
                                            {numberFormatter.format(u.activity?.ratings_count ?? 0)}
                                        </td>
                                        <td className="count-cell">
                                            {numberFormatter.format(u.activity?.watchlist_count ?? 0)}
                                        </td>
                                        <td className="date-cell">
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="view-btn"
                                                onClick={() => navigate(`/admin/users/${u.user_id}`)}
                                            >
                                                <FontAwesomeIcon icon={faUsers} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="admin-pagination">
                        <button
                            className="page-btn"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Prev
                        </button>
                        <span className="page-status">
                            Page {page} / {totalPages}
                        </span>
                        <button
                            className="page-btn"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUsers;



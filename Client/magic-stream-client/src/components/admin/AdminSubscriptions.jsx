import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartLine,
    faCreditCard,
    faHome,
    faMoneyBillWave,
    faRotate,
    faSearch,
    faXmark,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import Spinner from '../spinner/Spinner';
import './AdminSubscriptions.css';

const toDateInputValue = (d) => {
    if (!d) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const AdminSubscriptions = () => {
    const axiosPrivate = useAxiosPrivate();

    const [activeTab, setActiveTab] = useState('subscriptions'); // subscriptions | payments | analytics

    // Shared reference data
    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);

    // Subscriptions tab state
    const [subs, setSubs] = useState([]);
    const [subsLoading, setSubsLoading] = useState(true);
    const [subsError, setSubsError] = useState(null);
    const [subsPage, setSubsPage] = useState(1);
    const [subsTotalPages, setSubsTotalPages] = useState(0);
    const [subsTotal, setSubsTotal] = useState(0);
    const [subsQuery, setSubsQuery] = useState('');
    const [subsStatus, setSubsStatus] = useState('');
    const [subsPlanId, setSubsPlanId] = useState('');
    const [subsFrom, setSubsFrom] = useState('');
    const [subsTo, setSubsTo] = useState('');
    const [subsActionBusyId, setSubsActionBusyId] = useState(null);
    const [subsReloadKey, setSubsReloadKey] = useState(0);

    // Payments tab state
    const [payments, setPayments] = useState([]);
    const [payLoading, setPayLoading] = useState(true);
    const [payError, setPayError] = useState(null);
    const [payPage, setPayPage] = useState(1);
    const [payTotalPages, setPayTotalPages] = useState(0);
    const [payTotal, setPayTotal] = useState(0);
    const [payQuery, setPayQuery] = useState('');
    const [payStatus, setPayStatus] = useState('');
    const [payPlanId, setPayPlanId] = useState('');
    const [payFrom, setPayFrom] = useState('');
    const [payTo, setPayTo] = useState('');

    // Analytics tab state
    const [granularity, setGranularity] = useState('day');
    const [analyticsFrom, setAnalyticsFrom] = useState(() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 30);
        return toDateInputValue(d);
    });
    const [analyticsTo, setAnalyticsTo] = useState(() => toDateInputValue(new Date()));

    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState(null);
    const [revenue, setRevenue] = useState({ currency: 'USD', total: 0, series: [] });
    const [subTrends, setSubTrends] = useState({ series: [] });
    const [popularPlans, setPopularPlans] = useState({ items: [] });

    const currencyFormatter = useMemo(
        () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
        []
    );
    const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

    // Fetch plans once (used by filters)
    useEffect(() => {
        let isMounted = true;
        const fetchPlans = async () => {
            setPlansLoading(true);
            try {
                const res = await axiosPrivate.get('/plans');
                if (!isMounted) return;
                setPlans(res.data || []);
            } catch (err) {
                console.error('Error fetching plans:', err);
                if (!isMounted) return;
                setPlans([]);
            } finally {
                if (isMounted) setPlansLoading(false);
            }
        };
        fetchPlans();
        return () => {
            isMounted = false;
        };
    }, [axiosPrivate]);

    // Subscriptions fetch
    useEffect(() => {
        if (activeTab !== 'subscriptions') return;

        let isMounted = true;
        const controller = new AbortController();

        const fetchSubs = async () => {
            setSubsLoading(true);
            setSubsError(null);
            try {
                const params = {
                    page: subsPage,
                    limit: 20,
                };
                if (subsQuery.trim()) params.q = subsQuery.trim();
                if (subsStatus) params.status = subsStatus;
                if (subsPlanId) params.plan_id = subsPlanId;
                if (subsFrom) params.from = subsFrom;
                if (subsTo) params.to = subsTo;

                const res = await axiosPrivate.get('/admin/subscriptions', {
                    params,
                    signal: controller.signal,
                });
                if (!isMounted) return;
                setSubs(res.data?.items || []);
                setSubsTotal(res.data?.total ?? 0);
                setSubsTotalPages(res.data?.totalPages ?? 0);
            } catch (err) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error('Error fetching subscriptions:', err);
                if (!isMounted) return;
                setSubsError(err.response?.data?.error || 'Failed to load subscriptions');
                setSubs([]);
                setSubsTotal(0);
                setSubsTotalPages(0);
            } finally {
                if (isMounted) setSubsLoading(false);
            }
        };

        const t = setTimeout(fetchSubs, 250);
        return () => {
            isMounted = false;
            controller.abort();
            clearTimeout(t);
        };
    }, [activeTab, axiosPrivate, subsPage, subsQuery, subsStatus, subsPlanId, subsFrom, subsTo, subsReloadKey]);

    const refreshSubs = () => setSubsReloadKey((k) => k + 1);

    const handleCancelSubscription = async (id) => {
        if (!window.confirm('Cancel this subscription (auto-renew off)?')) return;
        setSubsActionBusyId(id);
        try {
            await axiosPrivate.patch(`/admin/subscriptions/${id}/cancel`);
            refreshSubs();
        } catch (err) {
            console.error('Cancel subscription failed:', err);
            setSubsError(err.response?.data?.error || 'Failed to cancel subscription');
        } finally {
            setSubsActionBusyId(null);
        }
    };

    const handleActivateSubscription = async (id) => {
        if (!window.confirm('Activate this subscription?')) return;
        setSubsActionBusyId(id);
        try {
            await axiosPrivate.patch(`/admin/subscriptions/${id}/activate`);
            refreshSubs();
        } catch (err) {
            console.error('Activate subscription failed:', err);
            setSubsError(err.response?.data?.error || 'Failed to activate subscription');
        } finally {
            setSubsActionBusyId(null);
        }
    };

    // Payments fetch
    useEffect(() => {
        if (activeTab !== 'payments') return;

        let isMounted = true;
        const controller = new AbortController();

        const fetchPayments = async () => {
            setPayLoading(true);
            setPayError(null);
            try {
                const params = {
                    page: payPage,
                    limit: 20,
                };
                if (payQuery.trim()) params.q = payQuery.trim();
                if (payStatus) params.status = payStatus;
                if (payPlanId) params.plan_id = payPlanId;
                if (payFrom) params.from = payFrom;
                if (payTo) params.to = payTo;

                const res = await axiosPrivate.get('/admin/payments', {
                    params,
                    signal: controller.signal,
                });
                if (!isMounted) return;
                setPayments(res.data?.items || []);
                setPayTotal(res.data?.total ?? 0);
                setPayTotalPages(res.data?.totalPages ?? 0);
            } catch (err) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error('Error fetching payments:', err);
                if (!isMounted) return;
                setPayError(err.response?.data?.error || 'Failed to load payments');
                setPayments([]);
                setPayTotal(0);
                setPayTotalPages(0);
            } finally {
                if (isMounted) setPayLoading(false);
            }
        };

        const t = setTimeout(fetchPayments, 250);
        return () => {
            isMounted = false;
            controller.abort();
            clearTimeout(t);
        };
    }, [activeTab, axiosPrivate, payPage, payQuery, payStatus, payPlanId, payFrom, payTo]);

    // Analytics fetch
    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        try {
            const [revRes, subRes, popRes] = await Promise.all([
                axiosPrivate.get('/admin/analytics/revenue', {
                    params: { granularity, from: analyticsFrom, to: analyticsTo },
                }),
                axiosPrivate.get('/admin/analytics/subscriptions', {
                    params: { granularity, from: analyticsFrom, to: analyticsTo },
                }),
                axiosPrivate.get('/admin/analytics/plans/popular', {
                    params: { from: analyticsFrom, to: analyticsTo, limit: 5 },
                }),
            ]);
            setRevenue(revRes.data || { currency: 'USD', total: 0, series: [] });
            setSubTrends(subRes.data || { series: [] });
            setPopularPlans(popRes.data || { items: [] });
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setAnalyticsError(err.response?.data?.error || 'Failed to load analytics');
            setRevenue({ currency: 'USD', total: 0, series: [] });
            setSubTrends({ series: [] });
            setPopularPlans({ items: [] });
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'analytics') return;
        fetchAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, granularity, analyticsFrom, analyticsTo]);

    const statusBadgeClass = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'status-badge active';
            case 'CANCELED':
                return 'status-badge canceled';
            case 'EXPIRED':
                return 'status-badge expired';
            case 'SUCCESS':
                return 'status-badge success';
            case 'FAILED':
                return 'status-badge failed';
            case 'PENDING':
                return 'status-badge pending';
            case 'REFUNDED':
                return 'status-badge refunded';
            default:
                return 'status-badge';
        }
    };

    const maxRevenue = useMemo(() => {
        const s = revenue?.series || [];
        return s.reduce((m, p) => Math.max(m, Number(p.amount) || 0), 0);
    }, [revenue]);

    const maxSubs = useMemo(() => {
        const s = subTrends?.series || [];
        return s.reduce(
            (m, p) => Math.max(m, Number(p.new_subscriptions) || 0, Number(p.canceled_subscriptions) || 0),
            0
        );
    }, [subTrends]);

    return (
        <div className="admin-subscriptions">
            <div className="admin-subscriptions-container">
                <div className="admin-subscriptions-header">
                    <div>
                        <h1 className="admin-subscriptions-title">Subscriptions & Revenue</h1>
                        <p className="admin-subscriptions-subtitle">
                            Manage subscriptions, payments, and revenue analytics
                        </p>
                    </div>
                    <Link to="/admin" className="back-btn">
                        <FontAwesomeIcon icon={faHome} />
                        Dashboard
                    </Link>
                </div>

                <div className="admin-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('subscriptions')}
                    >
                        <FontAwesomeIcon icon={faCreditCard} />
                        Subscriptions
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        <FontAwesomeIcon icon={faMoneyBillWave} />
                        Payments
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        <FontAwesomeIcon icon={faChartLine} />
                        Analytics
                    </button>
                </div>

                {/* Subscriptions tab */}
                {activeTab === 'subscriptions' && (
                    <>
                        <div className="filters-panel">
                            <div className="search-wrapper">
                                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                <input
                                    className="search-input"
                                    value={subsQuery}
                                    placeholder="Search by email or user_id..."
                                    onChange={(e) => {
                                        setSubsQuery(e.target.value);
                                        setSubsPage(1);
                                    }}
                                />
                            </div>

                            <div className="filters-row">
                                <div className="filter-group">
                                    <label className="filter-label">Status</label>
                                    <select
                                        className="filter-select"
                                        value={subsStatus}
                                        onChange={(e) => {
                                            setSubsStatus(e.target.value);
                                            setSubsPage(1);
                                        }}
                                    >
                                        <option value="">All</option>
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="CANCELED">CANCELED</option>
                                        <option value="EXPIRED">EXPIRED</option>
                                    </select>
                                </div>

                                <div className="filter-group">
                                    <label className="filter-label">Plan</label>
                                    <select
                                        className="filter-select"
                                        value={subsPlanId}
                                        onChange={(e) => {
                                            setSubsPlanId(e.target.value);
                                            setSubsPage(1);
                                        }}
                                        disabled={plansLoading}
                                    >
                                        <option value="">All</option>
                                        {plans.map((p) => (
                                            <option key={p.plan_id} value={p.plan_id}>
                                                {p.name} ({currencyFormatter.format(p.price_monthly)}/mo)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="filter-group">
                                    <label className="filter-label">From</label>
                                    <input
                                        type="date"
                                        className="filter-input"
                                        value={subsFrom}
                                        onChange={(e) => {
                                            setSubsFrom(e.target.value);
                                            setSubsPage(1);
                                        }}
                                    />
                                </div>

                                <div className="filter-group">
                                    <label className="filter-label">To</label>
                                    <input
                                        type="date"
                                        className="filter-input"
                                        value={subsTo}
                                        onChange={(e) => {
                                            setSubsTo(e.target.value);
                                            setSubsPage(1);
                                        }}
                                    />
                                </div>

                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        setSubsQuery('');
                                        setSubsStatus('');
                                        setSubsPlanId('');
                                        setSubsFrom('');
                                        setSubsTo('');
                                        setSubsPage(1);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="list-meta">
                            <span>
                                Showing {numberFormatter.format(subs.length)} of {numberFormatter.format(subsTotal)} subscriptions
                            </span>
                        </div>

                        {subsError && <div className="error-message">{subsError}</div>}

                        {subsLoading ? (
                            <div className="admin-page-loading">
                                <Spinner />
                            </div>
                        ) : (
                            <>
                                <div className="table-wrapper">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Plan</th>
                                                <th>Status</th>
                                                <th>Started</th>
                                                <th>Expires</th>
                                                <th>Auto renew</th>
                                                <th>Method</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subs.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="empty-state">
                                                        No subscriptions found
                                                    </td>
                                                </tr>
                                            ) : (
                                                subs.map((s) => {
                                                    const isBusy = subsActionBusyId === s._id;
                                                    const status = s.status || '—';
                                                    const canCancel = status === 'ACTIVE';
                                                    const canActivate = status === 'CANCELED' || status === 'EXPIRED';

                                                    return (
                                                        <tr key={s._id}>
                                                            <td className="user-col">
                                                                <div className="user-col-inner">
                                                                    <div className="user-email">{s.user_email || '—'}</div>
                                                                    <div className="user-id mono">{s.user_id}</div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="plan-col">
                                                                    <div className="plan-name">{s.plan_name || s.plan_id || '—'}</div>
                                                                    <div className="plan-id mono">{s.plan_id}</div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={statusBadgeClass(status)}>{status}</span>
                                                            </td>
                                                            <td className="date-col">
                                                                {s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="date-col">
                                                                {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td>{s.auto_renew ? 'Yes' : 'No'}</td>
                                                            <td>{s.payment_method || '—'}</td>
                                                            <td className="actions-col">
                                                                {canCancel && (
                                                                    <button
                                                                        className="btn-danger"
                                                                        onClick={() => handleCancelSubscription(s._id)}
                                                                        disabled={isBusy}
                                                                    >
                                                                        {isBusy ? (
                                                                            'Working…'
                                                                        ) : (
                                                                            <>
                                                                                <FontAwesomeIcon icon={faXmark} />
                                                                                Cancel
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                {canActivate && (
                                                                    <button
                                                                        className="btn-primary"
                                                                        onClick={() => handleActivateSubscription(s._id)}
                                                                        disabled={isBusy}
                                                                    >
                                                                        {isBusy ? (
                                                                            'Working…'
                                                                        ) : (
                                                                            <>
                                                                                <FontAwesomeIcon icon={faRotate} />
                                                                                Activate
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                {!canCancel && !canActivate && <span className="muted">—</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {subsTotalPages > 1 && (
                                    <div className="admin-pagination">
                                        <button
                                            className="page-btn"
                                            disabled={subsPage <= 1}
                                            onClick={() => setSubsPage((p) => Math.max(1, p - 1))}
                                        >
                                            Prev
                                        </button>
                                        <span className="page-status">
                                            Page {subsPage} / {subsTotalPages}
                                        </span>
                                        <button
                                            className="page-btn"
                                            disabled={subsPage >= subsTotalPages}
                                            onClick={() => setSubsPage((p) => Math.min(subsTotalPages, p + 1))}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Payments tab */}
                {activeTab === 'payments' && (
                    <>
                        <div className="filters-panel">
                            <div className="search-wrapper">
                                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                <input
                                    className="search-input"
                                    value={payQuery}
                                    placeholder="Search by email, user_id, transaction_id..."
                                    onChange={(e) => {
                                        setPayQuery(e.target.value);
                                        setPayPage(1);
                                    }}
                                />
                            </div>

                            <div className="filters-row">
                                <div className="filter-group">
                                    <label className="filter-label">Status</label>
                                    <select
                                        className="filter-select"
                                        value={payStatus}
                                        onChange={(e) => {
                                            setPayStatus(e.target.value);
                                            setPayPage(1);
                                        }}
                                    >
                                        <option value="">All</option>
                                        <option value="SUCCESS">SUCCESS</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="FAILED">FAILED</option>
                                        <option value="REFUNDED">REFUNDED</option>
                                    </select>
                                </div>

                                <div className="filter-group">
                                    <label className="filter-label">Plan</label>
                                    <select
                                        className="filter-select"
                                        value={payPlanId}
                                        onChange={(e) => {
                                            setPayPlanId(e.target.value);
                                            setPayPage(1);
                                        }}
                                        disabled={plansLoading}
                                    >
                                        <option value="">All</option>
                                        {plans.map((p) => (
                                            <option key={p.plan_id} value={p.plan_id}>
                                                {p.name} ({currencyFormatter.format(p.price_monthly)}/mo)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="filter-group">
                                    <label className="filter-label">From</label>
                                    <input
                                        type="date"
                                        className="filter-input"
                                        value={payFrom}
                                        onChange={(e) => {
                                            setPayFrom(e.target.value);
                                            setPayPage(1);
                                        }}
                                    />
                                </div>

                                <div className="filter-group">
                                    <label className="filter-label">To</label>
                                    <input
                                        type="date"
                                        className="filter-input"
                                        value={payTo}
                                        onChange={(e) => {
                                            setPayTo(e.target.value);
                                            setPayPage(1);
                                        }}
                                    />
                                </div>

                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        setPayQuery('');
                                        setPayStatus('');
                                        setPayPlanId('');
                                        setPayFrom('');
                                        setPayTo('');
                                        setPayPage(1);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="list-meta">
                            <span>
                                Showing {numberFormatter.format(payments.length)} of {numberFormatter.format(payTotal)} payments
                            </span>
                        </div>

                        {payError && <div className="error-message">{payError}</div>}

                        {payLoading ? (
                            <div className="admin-page-loading">
                                <Spinner />
                            </div>
                        ) : (
                            <>
                                <div className="table-wrapper">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Created</th>
                                                <th>User</th>
                                                <th>Plan</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Method</th>
                                                <th>Transaction</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="empty-state">
                                                        No payments found
                                                    </td>
                                                </tr>
                                            ) : (
                                                payments.map((p) => (
                                                    <tr key={p._id}>
                                                        <td className="date-col">
                                                            {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                                                        </td>
                                                        <td className="user-col">
                                                            <div className="user-col-inner">
                                                                <div className="user-email">{p.user_email || '—'}</div>
                                                                <div className="user-id mono">{p.user_id}</div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="plan-col">
                                                                <div className="plan-name">{p.plan_name || p.plan_id || '—'}</div>
                                                                <div className="plan-id mono">{p.plan_id}</div>
                                                            </div>
                                                        </td>
                                                        <td className="amount-col">
                                                            {currencyFormatter.format(p.amount ?? 0)}
                                                        </td>
                                                        <td>
                                                            <span className={statusBadgeClass(p.status)}>{p.status}</span>
                                                        </td>
                                                        <td>
                                                            <div className="method-col">
                                                                <div>{p.payment_method || '—'}</div>
                                                                {p.card_last4 && <div className="muted">•••• {p.card_last4}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="mono">
                                                            {p.transaction_id || '—'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {payTotalPages > 1 && (
                                    <div className="admin-pagination">
                                        <button
                                            className="page-btn"
                                            disabled={payPage <= 1}
                                            onClick={() => setPayPage((p) => Math.max(1, p - 1))}
                                        >
                                            Prev
                                        </button>
                                        <span className="page-status">
                                            Page {payPage} / {payTotalPages}
                                        </span>
                                        <button
                                            className="page-btn"
                                            disabled={payPage >= payTotalPages}
                                            onClick={() => setPayPage((p) => Math.min(payTotalPages, p + 1))}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Analytics tab */}
                {activeTab === 'analytics' && (
                    <>
                        <div className="analytics-controls">
                            <div className="filter-group">
                                <label className="filter-label">Granularity</label>
                                <select
                                    className="filter-select"
                                    value={granularity}
                                    onChange={(e) => setGranularity(e.target.value)}
                                >
                                    <option value="day">Daily</option>
                                    <option value="week">Weekly</option>
                                    <option value="month">Monthly</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">From</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    value={analyticsFrom}
                                    onChange={(e) => setAnalyticsFrom(e.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">To</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    value={analyticsTo}
                                    onChange={(e) => setAnalyticsTo(e.target.value)}
                                />
                            </div>

                            <button className="btn-primary" onClick={fetchAnalytics}>
                                <FontAwesomeIcon icon={faRotate} />
                                Refresh
                            </button>
                        </div>

                        {analyticsError && <div className="error-message">{analyticsError}</div>}

                        {analyticsLoading ? (
                            <div className="admin-page-loading">
                                <Spinner />
                            </div>
                        ) : (
                            <div className="analytics-grid">
                                <div className="analytics-card">
                                    <div className="analytics-card-title">Revenue</div>
                                    <div className="analytics-kpi">
                                        {currencyFormatter.format(revenue?.total ?? 0)}
                                    </div>
                                    <div className="chart">
                                        {(revenue?.series || []).length === 0 ? (
                                            <div className="empty-chart">No data</div>
                                        ) : (
                                            <div className="bars">
                                                {revenue.series.map((p) => {
                                                    const v = Number(p.amount) || 0;
                                                    const pct = maxRevenue > 0 ? (v / maxRevenue) * 100 : 0;
                                                    return (
                                                        <div key={p.period_start} className="bar-group">
                                                            <div className="bar revenue" style={{ height: `${pct}%` }} />
                                                            <div className="bar-label">{p.period_start}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="analytics-card">
                                    <div className="analytics-card-title">Subscription Trends</div>
                                    <div className="analytics-kpi-row">
                                        <div>
                                            <div className="kpi-label">New</div>
                                            <div className="kpi-value">
                                                {numberFormatter.format(
                                                    (subTrends?.series || []).reduce(
                                                        (sum, p) => sum + (Number(p.new_subscriptions) || 0),
                                                        0
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="kpi-label">Canceled</div>
                                            <div className="kpi-value">
                                                {numberFormatter.format(
                                                    (subTrends?.series || []).reduce(
                                                        (sum, p) => sum + (Number(p.canceled_subscriptions) || 0),
                                                        0
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart">
                                        {(subTrends?.series || []).length === 0 ? (
                                            <div className="empty-chart">No data</div>
                                        ) : (
                                            <div className="bars grouped">
                                                {subTrends.series.map((p) => {
                                                    const newV = Number(p.new_subscriptions) || 0;
                                                    const cancelV = Number(p.canceled_subscriptions) || 0;
                                                    const newPct = maxSubs > 0 ? (newV / maxSubs) * 100 : 0;
                                                    const cancelPct = maxSubs > 0 ? (cancelV / maxSubs) * 100 : 0;
                                                    return (
                                                        <div key={p.period_start} className="bar-group">
                                                            <div className="bar-stack">
                                                                <div className="bar new" style={{ height: `${newPct}%` }} />
                                                                <div className="bar canceled" style={{ height: `${cancelPct}%` }} />
                                                            </div>
                                                            <div className="bar-label">{p.period_start}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="analytics-card full">
                                    <div className="analytics-card-title">Most Popular Plans</div>
                                    <div className="table-wrapper">
                                        <table className="admin-table compact">
                                            <thead>
                                                <tr>
                                                    <th>Plan</th>
                                                    <th>Subscriptions</th>
                                                    <th>Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(popularPlans?.items || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="3" className="empty-state">
                                                            No data
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    popularPlans.items.map((p) => (
                                                        <tr key={p.plan_id}>
                                                            <td>
                                                                <div className="plan-col">
                                                                    <div className="plan-name">{p.plan_name || p.plan_id}</div>
                                                                    <div className="plan-id mono">{p.plan_id}</div>
                                                                </div>
                                                            </td>
                                                            <td className="count-col">
                                                                {numberFormatter.format(p.subscriptions ?? 0)}
                                                            </td>
                                                            <td className="amount-col">
                                                                {currencyFormatter.format(p.revenue ?? 0)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminSubscriptions;



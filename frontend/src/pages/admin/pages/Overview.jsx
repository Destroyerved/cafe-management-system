import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../../api/axios';
import styles from '../Dashboard.module.css';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

const PERIODS = ['today', 'weekly', 'monthly', 'yearly'];
const PIE_COLORS = ['#facc15', '#000000', '#64748b', '#e2e8f0'];

export default function Overview() {
    const [period, setPeriod] = useState('today');
    const navigate = useNavigate();

    const { data: dash } = useQuery({
        queryKey: ['dashboard', period],
        queryFn: () => api.get(`/reports/dashboard?period=${period}`).then(r => r.data.data),
    });

    const { data: chart } = useQuery({
        queryKey: ['sales-chart', period],
        queryFn: () => api.get(`/reports/sales-chart?period=${period}`).then(r => r.data.data),
    });

    const { data: topProducts } = useQuery({
        queryKey: ['top-products', period],
        queryFn: () => api.get(`/reports/top-products?period=${period}`).then(r => r.data.data),
    });

    const { data: topCategories } = useQuery({
        queryKey: ['top-categories', period],
        queryFn: () => api.get(`/reports/top-categories?period=${period}`).then(r => r.data.data.map(d => ({...d, revenue: parseFloat(d.revenue)}))),
    });

    const { data: topOrders } = useQuery({
        queryKey: ['top-orders', period],
        queryFn: () => api.get(`/reports/top-orders?period=${period}`).then(r => r.data.data),
    });

    const { data: staffSummary } = useQuery({
        queryKey: ['staff-summary'],
        queryFn: () => api.get('/staff/summary').then(r => r.data.data),
    });

    return (
        <div>
            {/* PAGE HEADER */}
            <div className={styles.pageHeader}>
                <div>
                    <div className={styles.pageTitle}>Overview</div>
                    <div className={styles.pageSub}>Real-time sales and operations</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {PERIODS.map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={styles.actionBtn}
                            style={{
                                background: period === p ? '#facc15' : 'var(--surface)', color: period === p ? '#000' : 'var(--text-primary)',
                                boxShadow: period === p ? '2px 2px 0 0 var(--border-medium)' : 'none',
                                border: '2px solid var(--border-medium)',
                                padding: '6px 14px',
                                fontSize: 10,
                            }}
                        >
                            {p.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI CARDS */}
            <div className={styles.kpiGrid}>
                <div
                    className={[styles.kpiCard, styles.kpiYellow].join(' ')}
                    onClick={() => navigate('/dashboard/orders')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className={styles.kpiLabel}>Total Orders</div>
                    <div className={styles.kpiValue}>{dash?.total_orders ?? '—'}</div>
                    <div className={styles.kpiSub}>Click to view all orders →</div>
                </div>

                <div
                    className={[styles.kpiCard, styles.kpiGreen].join(' ')}
                    onClick={() => navigate('/dashboard/reports')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className={styles.kpiLabel}>Revenue</div>
                    <div className={styles.kpiValue}>₹{dash?.revenue ?? '—'}</div>
                    <div className={styles.kpiSub}>
                        {dash?.revenue_change > 0 ? '+' : ''}{dash?.revenue_change ?? 0}% vs prev period
                    </div>
                </div>

                <div
                    className={[styles.kpiCard, styles.kpiBlue].join(' ')}
                    onClick={() => navigate('/dashboard/orders')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className={styles.kpiLabel}>Avg Order Value</div>
                    <div className={styles.kpiValue}>₹{dash?.avg_order ?? '—'}</div>
                    <div className={styles.kpiSub}>per transaction</div>
                </div>

                <div
                    className={[styles.kpiCard, styles.kpiRed].join(' ')}
                    onClick={() => navigate('/dashboard/staff')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className={styles.kpiLabel}>Active Staff</div>
                    <div className={styles.kpiValue}>{staffSummary?.length ?? '—'}</div>
                    <div className={styles.kpiSub}>Click to view staff →</div>
                </div>
            </div>

            {/* CHARTS ROW */}
            <div className={styles.grid2} style={{ marginBottom: 20 }}>
                {/* SALES CHART */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.boxTitle}>Sales Chart</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Revenue over time
                        </span>
                    </div>
                    <div className={styles.boxBody}>
                        {chart?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chart}>
                                    <XAxis dataKey="time" tick={{ fontSize: 10, fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} />
                                    <Tooltip
                                        contentStyle={{
                                            border: '3px solid #000',
                                            borderRadius: 0,
                                            boxShadow: '4px 4px 0 0 #000',
                                            fontWeight: 700,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#facc15"
                                        strokeWidth={3}
                                        dot={{ fill: '#000', strokeWidth: 2, r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.empty}>
                                <div className={styles.emptyTitle}>No data yet</div>
                                <div className={styles.emptySub}>Complete some orders to see chart</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* PIE CHART */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.boxTitle}>Top Categories</span>
                    </div>
                    <div className={styles.boxBody}>
                        {topCategories?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={topCategories}
                                        dataKey="revenue"
                                        nameKey="category"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        strokeWidth={2}
                                        stroke="#000"
                                    >
                                        {topCategories.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        formatter={(value) => (
                                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                                                {value}
                                            </span>
                                        )}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            border: '3px solid #000',
                                            borderRadius: 0,
                                            fontWeight: 700,
                                            fontSize: 12,
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={styles.empty}>
                                <div className={styles.emptyTitle}>No data yet</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM ROW */}
            <div className={styles.grid2}>
                {/* TOP PRODUCTS */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.boxTitle}>Top Products</span>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Product</th>
                                    <th className={styles.th}>Qty</th>
                                    <th className={styles.th}>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts?.length > 0 ? topProducts.map((p, i) => (
                                    <tr key={i} className={styles.tr}>
                                        <td className={styles.td}>
                                            <span style={{ fontWeight: 700 }}>{p.product}</span>
                                        </td>
                                        <td className={styles.td}>{Math.floor(p.qty)}</td>
                                        <td className={styles.td}>
                                            <span style={{ fontWeight: 900 }}>₹{parseFloat(p.revenue).toFixed(0)}</span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td className={styles.td} colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>
                                            No data yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* STAFF SUMMARY */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.boxTitle}>Staff Summary</span>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Name</th>
                                    <th className={styles.th}>Hours</th>
                                    <th className={styles.th}>Orders</th>
                                    <th className={styles.th}>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffSummary?.map((s, i) => (
                                    <tr key={i} className={styles.tr}>
                                        <td className={styles.td}>
                                            <div style={{ fontWeight: 700 }}>{s.name}</div>
                                            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                                                {s.role}
                                            </div>
                                        </td>
                                        <td className={styles.td}>{s.total_hours}h</td>
                                        <td className={styles.td}>{s.total_orders}</td>
                                        <td className={styles.td} style={{ fontWeight: 900 }}>
                                            ₹{parseFloat(s.total_revenue).toFixed(0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* TOP ORDERS */}
            <div className={styles.box}>
                <div className={styles.boxHeader}>
                    <span className={styles.boxTitle}>Top Orders</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Highest value
                    </span>
                </div>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Order #</th>
                                <th className={styles.th}>Table</th>
                                <th className={styles.th}>Employee</th>
                                <th className={styles.th}>Time</th>
                                <th className={styles.th}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topOrders?.length > 0 ? topOrders.map((o, i) => (
                                <tr key={i} className={styles.tr}>
                                    <td className={styles.td}>
                                        <span className={[styles.badge, styles.badgeBlack].join(' ')}>
                                            #{o.order_number}
                                        </span>
                                    </td>
                                    <td className={styles.td}>Table {o.table_number ?? '—'}</td>
                                    <td className={styles.td}>{o.employee}</td>
                                    <td className={styles.td} style={{ fontSize: 11, color: '#64748b' }}>
                                        {new Date(o.created_at).toLocaleTimeString()}
                                    </td>
                                    <td className={styles.td}>
                                        <span style={{ fontWeight: 900, fontSize: 15 }}>₹{parseFloat(o.total).toFixed(0)}</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className={styles.td} colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                                        No orders yet for this period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
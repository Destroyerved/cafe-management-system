import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import styles from '../Dashboard.module.css';

export default function Staff() {
  const { data: summary } = useQuery({
    queryKey: ['staff-summary'],
    queryFn: () => api.get('/staff/summary').then(r => r.data.data),
  });

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get('/staff/shifts').then(r => r.data.data),
  });

  const { data: payments } = useQuery({
    queryKey: ['staff-payments'],
    queryFn: () => api.get('/staff/payments').then(r => r.data.data),
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Staff</div>
          <div className={styles.pageSub}>Shift tracking and payroll</div>
        </div>
      </div>

      {/* STAFF SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {summary?.map(s => (
          <div key={s.id} className={styles.kpiCard} style={{ borderLeft: `6px solid ${s.role === 'admin' ? '#facc15' : s.role === 'kitchen' ? '#ef4444' : '#2563eb'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, background: s.role === 'kitchen' ? '#ef4444' : s.role === 'admin' ? '#facc15' : '#2563eb', color: s.role === 'admin' ? '#000' : '#fff', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>
                {s.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 13, textTransform: 'uppercase' }}>{s.name}</div>
                <span className={[styles.badge, s.role === 'admin' ? styles.badgeAmber : s.role === 'kitchen' ? styles.badgeAmber : styles.badgeBlue].join(' ')} style={s.role === 'kitchen' ? {background:'#ef4444', color:'#fff', borderColor:'#000'} : {}}>{s.role}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                  {s.role === 'kitchen' ? `${s.avg_prep_time}` : `₹${parseFloat(s.avg_order).toFixed(0)}`}
                </div>
                <div style={{ fontSize: 8, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                  {s.role === 'kitchen' ? 'ATPT (mins)' : 'Avg Order Val'}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Hours', `${s.total_hours}h`],
                ['Sessions', s.total_sessions],
                ['Orders', s.total_orders],
                ['Revenue', `₹${parseFloat(s.total_revenue).toFixed(0)}`],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-medium)', padding: '6px 10px' }}>
                  <div style={{ fontSize: 8, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', border: '2px solid #d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>Total Paid</span>
              <span style={{ fontWeight: 900, fontSize: 14, color: '#000' }}>₹{parseFloat(s.total_paid).toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SHIFT HISTORY */}
      <div className={styles.box} style={{ marginBottom: 20 }}>
        <div className={styles.boxHeader}>
          <span className={styles.boxTitle}>Shift History</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Staff</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Opened</th>
                <th className={styles.th}>Closed</th>
                <th className={styles.th}>Hours</th>
                <th className={styles.th}>Orders</th>
                <th className={styles.th}>Revenue</th>
                <th className={styles.th}>Opening Cash</th>
                <th className={styles.th}>Closing Cash</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {shifts?.map(s => (
                <tr key={s.id} className={styles.tr}>
                  <td className={styles.td}><strong>{s.staff_name}</strong><div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>{s.staff_role}</div></td>
                  <td className={styles.td} style={{ fontSize: 12 }}>{new Date(s.opened_at).toLocaleDateString('en-IN')}</td>
                  <td className={styles.td} style={{ fontSize: 12 }}>{new Date(s.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className={styles.td} style={{ fontSize: 12 }}>{s.closed_at ? new Date(s.closed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span style={{ color: '#16a34a', fontWeight: 700 }}>Active</span>}</td>
                  <td className={styles.td}><strong>{s.hours_worked}h</strong></td>
                  <td className={styles.td}>{s.order_count}</td>
                  <td className={styles.td}><strong>₹{parseFloat(s.revenue).toFixed(0)}</strong></td>
                  <td className={styles.td}>₹{parseFloat(s.opening_cash).toFixed(0)}</td>
                  <td className={styles.td}>{s.closing_cash ? `₹${parseFloat(s.closing_cash).toFixed(0)}` : '—'}</td>
                  <td className={styles.td}><span className={[styles.badge, s.status === 'open' ? styles.badgePaid : styles.badgeDraft].join(' ')}>{s.status}</span></td>
                  <td className={styles.td}><strong>₹{parseFloat(s.total_paid).toFixed(0)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT HISTORY */}
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <span className={styles.boxTitle}>Payroll History</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Staff</th>
                <th className={styles.th}>Paid By</th>
                <th className={styles.th}>Amount</th>
                <th className={styles.th}>Note</th>
                <th className={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments?.map(p => (
                <tr key={p.id} className={styles.tr}>
                  <td className={styles.td}><strong>{p.staff_name}</strong></td>
                  <td className={styles.td}>{p.paid_by_name}</td>
                  <td className={styles.td}><strong style={{ color: '#16a34a' }}>₹{parseFloat(p.amount).toFixed(0)}</strong></td>
                  <td className={styles.td} style={{ fontSize: 12, color: '#64748b' }}>{p.note || '—'}</td>
                  <td className={styles.td} style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import styles from '../Dashboard.module.css';

const LIMIT = 30;

const STATUS_CLS = { draft: 'badgeDraft', paid: 'badgePaid', archived: 'badgeDraft' };

function Pagination({ meta, page, setPage }) {
  if (!meta || meta.pages <= 1) return null;
  const total = meta.pages;
  let start = Math.max(1, page - 2);
  let end   = Math.min(total, page + 2);
  if (end - start < 4) { start = Math.max(1, end - 4); end = Math.min(total, start + 4); }
  const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        Showing <strong>{meta.showing}</strong> orders
        <span style={{ marginLeft: 10, color: '#94a3b8' }}>({LIMIT} per page)</span>
      </span>
      <div className={styles.pageControls}>
        <button className={styles.pageBtn} onClick={() => setPage(1)} disabled={page === 1}>«</button>
        <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
        {start > 1 && <span style={{ padding: '6px 2px', fontSize: 10, color: '#94a3b8' }}>…</span>}
        {nums.map(n => (
          <button key={n} className={[styles.pageBtn, page === n ? styles.pageBtnActive : ''].join(' ')} onClick={() => setPage(n)}>{n}</button>
        ))}
        {end < total && <span style={{ padding: '6px 2px', fontSize: 10, color: '#94a3b8' }}>…</span>}
        <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page === total}>›</button>
        <button className={styles.pageBtn} onClick={() => setPage(total)} disabled={page === total}>»</button>
      </div>
    </div>
  );
}

export default function Orders() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ['orders', search, status, page],
    queryFn: () =>
      api.get('/orders', {
        params: { search: search || undefined, status: status || undefined, page, limit: LIMIT },
      }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const { data: detail } = useQuery({
    queryKey: ['order-detail', selected],
    queryFn: () => api.get(`/orders/${selected}`).then(r => r.data.data),
    enabled: !!selected,
  });

  const orders = result?.data || [];
  const meta   = result?.meta;

  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleStatus = (s) => { setStatus(s); setPage(1); };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Orders</div>
          <div className={styles.pageSub}>
            {meta?.total ?? 0} total orders · last {LIMIT}/page · click row for detail
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'draft', 'paid'].map(s => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              className={styles.actionBtn}
              style={{
                background: status === s ? '#facc15' : 'var(--surface)', color: status === s ? '#000' : 'var(--text-primary)', border: '2px solid var(--border-medium)',
                padding: '6px 16px', fontSize: 10,
                boxShadow: status === s ? '2px 2px 0 0 var(--border-medium)' : '3px 3px 0 0 var(--border-medium)',
              }}
            >
              {s === '' ? 'ALL' : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Rate-limit notice */}
      <div style={{ background: '#f0fdf4', border: '3px solid #16a34a', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Displaying {LIMIT} orders at a time — {meta?.total ?? '…'} total orders in database · use pagination to browse history
        </span>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          placeholder="Search by order number…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <span className={styles.boxTitle}>{meta ? `Showing ${meta.showing}` : 'All Orders'}</span>
          {meta && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Page {meta.page} / {meta.pages}
            </span>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Order No.</th>
                <th className={styles.th}>Date & Time</th>
                <th className={styles.th}>Table</th>
                <th className={styles.th}>Customer</th>
                <th className={styles.th}>Staff</th>
                <th className={styles.th}>Total</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className={styles.td} colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#64748b', fontWeight: 700 }}>Loading orders…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td className={styles.td} colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No orders found</td></tr>
              ) : orders.map((o, i) => (
                <tr key={o.id} className={[styles.tr, styles.trClickable].join(' ')} onClick={() => setSelected(o.id)}>
                  <td className={styles.td} style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                    {(meta.page - 1) * LIMIT + i + 1}
                  </td>
                  <td className={styles.td}>
                    <span className={[styles.badge, styles.badgeBlack].join(' ')}>#{o.order_number}</span>
                  </td>
                  <td className={styles.td} style={{ fontSize: 11 }}>
                    <div style={{ fontWeight: 700 }}>{fmtDate(o.created_at)}</div>
                    <div style={{ color: '#64748b', marginTop: 1 }}>{fmtTime(o.created_at)}</div>
                  </td>
                  <td className={styles.td}>{o.table_number ? `Table ${o.table_number}` : '—'}</td>
                  <td className={styles.td}>{o.customer_name || <span style={{ color: '#94a3b8' }}>Walk-in</span>}</td>
                  <td className={styles.td} style={{ fontSize: 12, color: '#475569' }}>{o.created_by_name}</td>
                  <td className={styles.td}>
                    <strong style={{ fontSize: 14 }}>₹{parseFloat(o.total).toFixed(0)}</strong>
                  </td>
                  <td className={styles.td}>
                    <span className={[styles.badge, styles[STATUS_CLS[o.status]]].join(' ')}>{o.status}</span>
                  </td>
                  <td className={styles.td} style={{ fontSize: 11, color: '#d97706', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.notes || <span style={{ color: '#e2e8f0' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} page={page} setPage={setPage} />
      </div>

      {/* Order Detail Modal */}
      {selected && detail && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                Order #{detail.order_number} — {detail.status.toUpperCase()}
              </span>
              <button className={styles.modalClose} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  ['Table',    detail.table_number ? `Table ${detail.table_number}` : 'Takeaway'],
                  ['Customer', detail.customer_name || 'Walk-in'],
                  ['Staff',    detail.created_by_name],
                  ['Date',     fmtDate(detail.created_at)],
                  ['Time',     fmtTime(detail.created_at)],
                  ['Status',   detail.status.toUpperCase()],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: 'var(--surface-alt)', border: '2px solid var(--border-medium)', padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>

              {detail.notes && (
                <div style={{ background: '#fef3c7', border: '2px solid #d97706', padding: '10px 14px', marginBottom: 16, fontSize: 12, fontWeight: 600, color: '#000' }}>
                  📝 {detail.notes}
                </div>
              )}

              {/* Lines */}
              <table className={styles.table} style={{ marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th className={styles.th}>Product</th>
                    <th className={styles.th}>Qty</th>
                    <th className={styles.th}>Unit Price</th>
                    <th className={styles.th}>Tax</th>
                    <th className={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines?.map(l => (
                    <tr key={l.id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: 700 }}>
                        {l.product_name}
                        {l.notes && <span style={{ marginLeft: 8, fontSize: 10, color: '#d97706', fontWeight: 600 }}>— {l.notes}</span>}
                      </td>
                      <td className={styles.td}>{Math.floor(l.quantity)}</td>
                      <td className={styles.td}>₹{parseFloat(l.unit_price).toFixed(0)}</td>
                      <td className={styles.td} style={{ color: '#d97706' }}>{l.tax_percent}%</td>
                      <td className={styles.td}><strong>₹{parseFloat(l.total).toFixed(0)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ border: '4px solid var(--border-medium)', padding: '16px 24px', boxShadow: '4px 4px 0 0 var(--border-medium)', minWidth: 250 }}>
                  {[
                    ['Subtotal', `₹${parseFloat(detail.subtotal).toFixed(2)}`],
                    ['Tax',      `₹${parseFloat(detail.tax_amount).toFixed(2)}`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      <span style={{ color: '#64748b', textTransform: 'uppercase' }}>{l}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, borderTop: '3px solid var(--border-medium)', paddingTop: 10, marginTop: 6 }}>
                    <span>TOTAL</span>
                    <span>₹{parseFloat(detail.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

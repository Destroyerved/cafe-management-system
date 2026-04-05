import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import styles from '../Dashboard.module.css';

const LIMIT = 30;

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
        Showing <strong>{meta.showing}</strong> customers
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

const TIER_LABEL = (v) => v >= 10 ? 'VIP'     : v >= 5 ? 'Regular' : 'New';
const TIER_CLASS = (v) => v >= 10 ? 'badgeAmber' : v >= 5 ? 'badgePaid' : 'badgeBlue';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  const { data: result, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () =>
      api.get('/customers', { params: { search: search || undefined, page, limit: LIMIT } })
         .then(r => r.data.data),
    keepPreviousData: true,
  });

  const customers = result?.data || [];
  const meta      = result?.meta;

  const handleSearch = (v) => { setSearch(v); setPage(1); };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Customers</div>
          <div className={styles.pageSub}>
            {meta?.total ?? 0} registered · showing {LIMIT}/page · sorted by spend
          </div>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Rate-limit notice */}
      <div style={{ background: '#fef3c7', border: '3px solid #d97706', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Showing {LIMIT} customers per page — use pagination below to browse all {meta?.total ?? '…'} customers
        </span>
      </div>

      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <span className={styles.boxTitle}>{meta ? `Showing ${meta.showing}` : 'All Customers'}</span>
          {meta && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {meta.pages} pages total
            </span>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Phone</th>
                <th className={styles.th}>City</th>
                <th className={styles.th}>Visits</th>
                <th className={styles.th}>Total Spent</th>
                <th className={styles.th}>Tier</th>
                <th className={styles.th}>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className={styles.td} colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#64748b', fontWeight: 700 }}>Loading customers…</td></tr>
              ) : customers.length === 0 ? (
                <tr><td className={styles.td} colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No customers found</td></tr>
              ) : customers.map((c, i) => (
                <tr key={c.id} className={styles.tr}>
                  <td className={styles.td} style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                    {(meta.page - 1) * LIMIT + i + 1}
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, background: '#facc15', border: '2px solid #000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 14, flexShrink: 0,
                      }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{c.city || c.state || 'India'}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>{c.phone || '—'}</td>
                  <td className={styles.td} style={{ color: '#475569' }}>{c.city || '—'}</td>
                  <td className={styles.td}>
                    <span className={[styles.badge, c.visit_count >= 5 ? styles.badgePaid : styles.badgeDraft].join(' ')}>
                      {c.visit_count}×
                    </span>
                  </td>
                  <td className={styles.td}>
                    <strong style={{ fontSize: 14 }}>₹{parseFloat(c.total_sales || 0).toFixed(0)}</strong>
                  </td>
                  <td className={styles.td}>
                    <span className={[styles.badge, styles[TIER_CLASS(c.visit_count)]].join(' ')}>
                      {TIER_LABEL(c.visit_count)}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontSize: 11, color: '#64748b' }}>
                    {c.last_visit ? new Date(c.last_visit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} page={page} setPage={setPage} />
      </div>
    </div>
  );
}

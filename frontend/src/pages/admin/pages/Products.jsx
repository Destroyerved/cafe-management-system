import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import styles from '../Dashboard.module.css';
import toast from 'react-hot-toast';

const LIMIT = 20;
const UNITS = ['Unit', 'Piece', 'Plate', 'Cup', 'Glass', 'Bottle', 'Scoop', 'Slice', 'Bowl'];
const TAXES = ['0', '5', '12', '18', '28'];

function Pagination({ meta, page, setPage }) {
  if (!meta || meta.pages <= 1) return null;
  const total = meta.pages;
  const half  = 3;
  let start = Math.max(1, page - half);
  let end   = Math.min(total, page + half);
  if (end - start < half * 2) {
    start = Math.max(1, end - half * 2);
    end   = Math.min(total, start + half * 2);
  }
  const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        Showing <strong>{meta.showing}</strong> results
      </span>
      <div className={styles.pageControls}>
        <button className={styles.pageBtn} onClick={() => setPage(1)} disabled={page === 1}>«</button>
        <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹ Prev</button>
        {start > 1 && <span style={{ padding: '6px 4px', fontSize: 10, color: '#94a3b8' }}>…</span>}
        {nums.map(n => (
          <button key={n} className={[styles.pageBtn, page === n ? styles.pageBtnActive : ''].join(' ')} onClick={() => setPage(n)}>{n}</button>
        ))}
        {end < total && <span style={{ padding: '6px 4px', fontSize: 10, color: '#94a3b8' }}>…</span>}
        <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page === total}>Next ›</button>
        <button className={styles.pageBtn} onClick={() => setPage(total)} disabled={page === total}>»</button>
      </div>
    </div>
  );
}

export default function Products() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]  = useState(null);
  const [form, setForm] = useState({
    name: '', category_id: '', price: '', tax_percent: '5',
    unit_of_measure: 'Unit', description: '', image_url: '',
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['products', search, catFilter, page],
    queryFn: () =>
      api.get('/products', {
        params: { search: search || undefined, category_id: catFilter || undefined, page, limit: LIMIT },
      }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const products = result?.data || [];
  const meta     = result?.meta;

  const resetPage = () => setPage(1);
  const handleSearch = (v) => { setSearch(v); resetPage(); };
  const handleCat    = (id) => { setCatFilter(id); resetPage(); };

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', category_id: '', price: '', tax_percent: '5', unit_of_measure: 'Unit', description: '', image_url: '' });
    setShowModal(true);
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/products', data),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product created'); setShowModal(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product updated'); setShowModal(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/products/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Status updated'); },
  });

  const handleSave = () => {
    if (!form.name || !form.price) { toast.error('Name and price required'); return; }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Products</div>
          <div className={styles.pageSub}>
            {meta?.total ?? 0} menu items · {LIMIT}/page · filtered by category
          </div>
        </div>
        <button className={styles.actionBtn} onClick={openNew}>+ New Product</button>
      </div>

      {/* Category filter tabs */}
      <div className={styles.catTabs}>
        <button
          className={[styles.catTab, !catFilter ? styles.catTabActive : ''].join(' ')}
          style={{ background: !catFilter ? '#facc15' : 'var(--surface)', color: !catFilter ? '#000' : 'var(--text-primary)' }}
          onClick={() => handleCat('')}
        >
          All ({meta?.total ?? '…'})
        </button>
        {categories?.map(c => (
          <button
            key={c.id}
            className={[styles.catTab, catFilter === String(c.id) ? styles.catTabActive : ''].join(' ')}
            style={{ background: catFilter === String(c.id) ? c.color : 'var(--surface)', color: catFilter === String(c.id) ? '#000' : 'var(--text-primary)' }}
            onClick={() => handleCat(String(c.id))}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          placeholder="Search menu items..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className={styles.box}>
        <div className={styles.boxHeader}>
          <span className={styles.boxTitle}>
            {isLoading ? 'Loading…' : meta ? `Showing ${meta.showing}` : 'Products'}
          </span>
          {meta && meta.pages > 1 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Page {meta.page} / {meta.pages}
            </span>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: 52 }}>Photo</th>
                <th className={styles.th}>Product</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Price</th>
                <th className={styles.th}>Tax</th>
                <th className={styles.th}>Unit</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className={styles.td} colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#64748b', fontWeight: 700 }}>
                    Loading products…
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td className={styles.td} colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                    No products found
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className={styles.tr}>
                    {/* Photo */}
                    <td className={styles.td} style={{ padding: '8px 12px' }}>
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: 40, height: 40, objectFit: 'cover', border: '2px solid #000', display: 'block' }}
                          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div style={{
                        width: 40, height: 40, background: p.category_color || 'var(--surface-alt)',
                        border: '2px solid var(--border-medium)', display: p.image_url ? 'none' : 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#000'
                      }}>🍽</div>
                    </td>

                    {/* Name */}
                    <td className={styles.td}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className={styles.td}>
                      <span
                        className={styles.badge}
                        style={{ background: p.category_color || 'var(--surface-alt)', color: p.category_color ? '#000' : 'var(--text-primary)', borderColor: 'var(--border-medium)', fontSize: 9 }}
                      >
                        {p.category_name || '—'}
                      </span>
                    </td>

                    {/* Price */}
                    <td className={styles.td}>
                      <strong style={{ fontSize: 15 }}>₹{parseFloat(p.price).toFixed(0)}</strong>
                    </td>

                    {/* Tax */}
                    <td className={styles.td}>
                      <span style={{ fontSize: 11, color: p.tax_percent > 0 ? '#d97706' : '#94a3b8', fontWeight: 700 }}>
                        {p.tax_percent}%
                      </span>
                    </td>

                    {/* Unit */}
                    <td className={styles.td}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{p.unit_of_measure}</span>
                    </td>

                    {/* Status */}
                    <td className={styles.td}>
                      <span className={[styles.badge, p.is_active ? styles.badgePaid : styles.badgeDraft].join(' ')}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className={[styles.actionBtn, styles.actionBtnSm, styles.actionBtnGhost].join(' ')}
                          onClick={() => {
                            setEditItem(p);
                            setForm({
                              name: p.name, category_id: String(p.category_id || ''),
                              price: String(p.price), tax_percent: String(p.tax_percent),
                              unit_of_measure: p.unit_of_measure, description: p.description || '',
                              image_url: p.image_url || '',
                            });
                            setShowModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className={[styles.actionBtn, styles.actionBtnSm, p.is_active ? styles.actionBtnDanger : ''].join(' ')}
                          onClick={() => toggleMutation.mutate(p.id)}
                        >
                          {p.is_active ? 'Off' : 'On'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} page={page} setPage={setPage} />
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{editItem ? 'Edit Product' : 'New Product'}</span>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Image preview */}
              {form.image_url && (
                <div style={{ marginBottom: 16, border: '3px solid #000', overflow: 'hidden', height: 120 }}>
                  <img src={form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={[styles.formField, styles.formGridFull].join(' ')}>
                  <label className={styles.formLabel}>Product Name *</label>
                  <input className={styles.formInput} placeholder="e.g. Butter Chicken" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Category</label>
                  <select className={styles.formInput} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">No category</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Price (₹) *</label>
                  <input className={styles.formInput} type="number" min="0" step="0.5" placeholder="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Tax %</label>
                  <select className={styles.formInput} value={form.tax_percent} onChange={e => setForm({ ...form, tax_percent: e.target.value })}>
                    {TAXES.map(t => <option key={t} value={t}>{t}%</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Unit</label>
                  <select className={styles.formInput} value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className={[styles.formField, styles.formGridFull].join(' ')}>
                  <label className={styles.formLabel}>Image URL (Unsplash / any)</label>
                  <input className={styles.formInput} placeholder="https://images.unsplash.com/photo-…" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                </div>
                <div className={[styles.formField, styles.formGridFull].join(' ')}>
                  <label className={styles.formLabel}>Description</label>
                  <input className={styles.formInput} placeholder="Short description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={[styles.actionBtn, styles.actionBtnGhost].join(' ')} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={styles.actionBtn} onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving…' : editItem ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

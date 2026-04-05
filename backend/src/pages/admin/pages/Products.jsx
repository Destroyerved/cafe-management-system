import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import styles from '../Dashboard.module.css';
import toast from 'react-hot-toast';

const UNITS = ['Piece', 'Plate', 'Cup', 'Glass', 'Bottle', 'Scoop', 'Slice', 'Bowl'];
const TAXES = ['0', '5', '12', '18', '28'];

const emptyForm = { name: '', category_id: '', price: '', tax_percent: '5', unit_of_measure: 'Piece', description: '', image_url: '' };

export default function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get('/products', { params: { search, limit: 100 } }).then(r => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
  });

  const openCreate = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setImagePreview('');
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      category_id: product.category_id || '',
      price: product.price,
      tax_percent: product.tax_percent,
      unit_of_measure: product.unit_of_measure,
      description: product.description || '',
      image_url: product.image_url || '',
    });
    setImagePreview(product.image_url || '');
    setShowModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setForm(f => ({ ...f, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
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
    const data = {
      ...form,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      price: parseFloat(form.price),
      tax_percent: parseFloat(form.tax_percent),
    };
    if (editProduct) updateMutation.mutate({ id: editProduct.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Products</div>
          <div className={styles.pageSub}>{products?.length ?? 0} menu items</div>
        </div>
        <button className={styles.actionBtn} onClick={openCreate}>+ New Product</button>
      </div>

      <div className={styles.searchBar}>
        <input className={styles.searchInput} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* PRODUCT GRID WITH IMAGES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {products?.map(p => (
          <div key={p.id} style={{
            background: '#fff', border: '4px solid #000',
            boxShadow: '4px 4px 0 0 #000',
            opacity: p.is_active ? 1 : 0.5,
            transition: 'all 200ms',
          }}>
            <div style={{ position: 'relative', height: 140, overflow: 'hidden', borderBottom: '3px solid #000' }}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: p.category_color || '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  🍽️
                </div>
              )}
              <div style={{ position: 'absolute', top: 6, right: 6 }}>
                <span style={{ background: p.is_active ? '#dcfce7' : '#fee2e2', border: `2px solid ${p.is_active ? '#16a34a' : '#dc2626'}`, borderRadius: 9999, fontSize: 8, fontWeight: 900, padding: '2px 8px', textTransform: 'uppercase' }}>
                  {p.is_active ? 'Active' : 'Off'}
                </span>
              </div>
            </div>
            <div style={{ padding: '12px 12px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4, lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 900 }}>₹{parseFloat(p.price).toFixed(0)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', border: '1px solid #e2e8f0' }}>{p.tax_percent}% GST</span>
              </div>
              <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 900, padding: '2px 8px', borderRadius: 9999, background: p.category_color || '#f1f5f9', border: '2px solid #000', marginBottom: 10, textTransform: 'uppercase' }}>
                {p.category_name || 'No category'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  className={styles.actionBtn}
                  style={{ fontSize: 9, padding: '6px 8px', boxShadow: '2px 2px 0 0 #000' }}
                  onClick={() => openEdit(p)}
                >
                  Edit
                </button>
                <button
                  className={[styles.actionBtn, p.is_active ? styles.actionBtnDanger : ''].join(' ')}
                  style={{ fontSize: 9, padding: '6px 8px', boxShadow: '2px 2px 0 0 #000', background: p.is_active ? '' : '#16a34a', borderColor: p.is_active ? '' : '#16a34a' }}
                  onClick={() => toggleMutation.mutate(p.id)}
                >
                  {p.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{editProduct ? `Edit — ${editProduct.name}` : 'New Product'}</span>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>

              {/* IMAGE UPLOAD */}
              <div style={{ marginBottom: 20 }}>
                <label className={styles.formLabel}>Product Image</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 8 }}>
                  <div style={{ width: 100, height: 100, border: '3px solid #000', boxShadow: '3px 3px 0 0 #000', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 32 }}>🍽️</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', cursor: 'pointer' }}>
                      <div className={styles.actionBtn} style={{ fontSize: 10, padding: '8px 14px', marginBottom: 8, display: 'inline-block' }}>
                        Upload Photo
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>JPG, PNG under 2MB</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 4 }}>Or paste image URL:</div>
                    <input
                      className={styles.formInput}
                      style={{ marginTop: 6, fontSize: 11 }}
                      placeholder="https://..."
                      value={form.image_url?.startsWith('data:') ? '' : form.image_url}
                      onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); setImagePreview(e.target.value); }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={[styles.formField, styles.formGridFull].join(' ')}>
                  <label className={styles.formLabel}>Product Name</label>
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
                  <label className={styles.formLabel}>Price (₹)</label>
                  <input className={styles.formInput} type="number" placeholder="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
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
                  <label className={styles.formLabel}>Description</label>
                  <input className={styles.formInput} placeholder="Short description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={[styles.actionBtn, styles.actionBtnGhost].join(' ')} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={styles.actionBtn} onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' });

export default function MenuPage({ tableData, tableToken, customerToken, onLogout }) {
  const { table, pos_config, categories = [], products = [] } = tableData;

  const [cart, setCart] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('menu'); // 'menu' | 'cart' | 'status'
  const [placing, setPlacing] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');

  // Poll order status every 8s when on status view
  useEffect(() => {
    if (view !== 'status') return;
    const fetch = () => pollStatus();
    fetch();
    const id = setInterval(fetch, 8000);
    return () => clearInterval(id);
  }, [view]);

  const pollStatus = async () => {
    try {
      const res = await api.get(`/self-order/${tableToken}/status`, {
        params: { customer_token: customerToken },
      });
      setOrderData(res.data.data);
    } catch { }
  };

  const filtered = products.filter(p => {
    const catOk = activeCat === 'all' || p.category_id === activeCat;
    const searchOk = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk && p.is_active !== false;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === product.id);
      if (ex) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, price: parseFloat(product.price), tax_percent: parseFloat(product.tax_percent), quantity: 1 }];
    });
  };

  const updateQty = (product_id, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product_id !== product_id));
    else setCart(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity: qty } : i));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity * (1 + i.tax_percent / 100), 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const placeOrder = async () => {
    if (!cart.length) return;
    setPlacing(true); setError('');
    try {
      await api.post(`/self-order/${tableToken}/order`, {
        customer_token: customerToken,
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setCart([]);
      setView('status');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to place order');
    } finally { setPlacing(false); }
  };

  const downloadBill = () => {
    if (!orderData?.order) return;
    const { order } = orderData;
    const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });
    let y = 10;
    const center = (text, size = 10, bold = false) => {
      doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, 40, y, { align: 'center' }); y += size * 0.5 + 2;
    };
    const line = (a, b, size = 9) => {
      doc.setFontSize(size); doc.setFont('helvetica', 'normal');
      doc.text(a, 5, y); doc.text(b, 75, y, { align: 'right' }); y += 6;
    };
    center(pos_config?.name || 'Cafe', 14, true);
    center(`Table ${table?.table_number}`, 10);
    center(new Date().toLocaleString('en-IN'), 8);
    y += 2; doc.line(5, y, 75, y); y += 4;
    order.lines?.forEach(l => { line(`${Math.floor(l.quantity)}x ${l.product_name}`, `₹${parseFloat(l.total).toFixed(0)}`); });
    y += 2; doc.line(5, y, 75, y); y += 4;
    line('Subtotal', `₹${parseFloat(order.subtotal).toFixed(2)}`);
    line('Tax', `₹${parseFloat(order.tax_amount).toFixed(2)}`);
    doc.setFont('helvetica', 'bold');
    line('TOTAL', `₹${parseFloat(order.total).toFixed(2)}`, 11);
    y += 4; center('Thank you! Visit again 🙏', 9);
    doc.save(`bill-table-${table?.table_number}.pdf`);
  };

  // ─── VIEWS ─────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <style>{globalCss}</style>

      {/* Top bar */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>C</div>
          <div>
            <div style={s.cafeName}>{pos_config?.name}</div>
            <div style={s.tableTag}>Table {table?.table_number}</div>
          </div>
        </div>
        <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
      </header>

      {/* Tab switcher */}
      <div style={s.tabs}>
        {['menu', 'cart', 'status'].map(t => (
          <button key={t} style={{ ...s.tab, ...(view === t ? s.tabActive : {}) }} onClick={() => setView(t)}>
            {t === 'cart' ? `🛒 Cart${cartCount > 0 ? ` (${cartCount})` : ''}` : t === 'status' ? '📋 Order' : '🍽 Menu'}
          </button>
        ))}
      </div>

      {/* ── MENU VIEW ── */}
      {view === 'menu' && (
        <div style={s.menuContainer}>
          {/* Category pills */}
          <div style={s.catScroll}>
            <button style={{ ...s.catPill, ...(activeCat === 'all' ? s.catPillActive : {}) }} onClick={() => setActiveCat('all')}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} style={{ ...s.catPill, ...(activeCat === c.id ? s.catPillActive : {}), borderColor: c.color || '#000' }}
                onClick={() => setActiveCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={s.searchWrap}>
            <input style={s.search} placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Products grid */}
          <div style={s.productGrid}>
            {filtered.map(p => {
              const inCart = cart.find(i => i.product_id === p.id);
              return (
                <div key={p.id} style={s.productCard}>
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} style={s.productImg}
                      onError={e => e.target.style.display = 'none'} />
                  )}
                  <div style={s.productBody}>
                    <div style={s.productName}>{p.name}</div>
                    <div style={s.productMeta}>
                      <span style={s.productPrice}>₹{parseFloat(p.price).toFixed(0)}</span>
                      {p.tax_percent > 0 && <span style={s.taxTag}>+{p.tax_percent}% tax</span>}
                    </div>
                    {inCart ? (
                      <div style={s.qtyRow}>
                        <button style={s.qtyBtn} onClick={() => updateQty(p.id, inCart.quantity - 1)}>−</button>
                        <span style={s.qtyNum}>{inCart.quantity}</span>
                        <button style={s.qtyBtn} onClick={() => updateQty(p.id, inCart.quantity + 1)}>+</button>
                      </div>
                    ) : (
                      <button style={s.addBtn} onClick={() => addToCart(p)}>+ Add</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CART VIEW ── */}
      {view === 'cart' && (
        <div style={s.cartContainer}>
          {cart.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: 52 }}>🛒</div>
              <div style={s.emptyTitle}>Cart is empty</div>
              <button style={s.goMenuBtn} onClick={() => setView('menu')}>Browse Menu</button>
            </div>
          ) : (
            <>
              <div style={s.cartItems}>
                {cart.map(item => (
                  <div key={item.product_id} style={s.cartItem}>
                    <div style={s.cartItemName}>{item.product_name}</div>
                    <div style={s.cartItemRight}>
                      <div style={s.qtyRow}>
                        <button style={s.qtyBtn} onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
                        <span style={s.qtyNum}>{item.quantity}</span>
                        <button style={s.qtyBtn} onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</button>
                      </div>
                      <span style={s.cartItemPrice}>₹{(item.price * item.quantity * (1 + item.tax_percent / 100)).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={s.cartFooter}>
                <div style={s.totalRow}>
                  <span style={s.totalLabel}>Total</span>
                  <span style={s.totalValue}>₹{cartTotal.toFixed(2)}</span>
                </div>
                {error && <div style={s.errorBox}>{error}</div>}
                <button style={{ ...s.placeBtn, opacity: placing ? 0.7 : 1 }} onClick={placeOrder} disabled={placing}>
                  {placing ? 'Placing order…' : `Place Order · ₹${cartTotal.toFixed(0)}`}
                </button>
                <div style={s.cartNote}>Staff will be notified automatically</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STATUS VIEW ── */}
      {view === 'status' && (
        <div style={s.statusContainer}>
          {!orderData?.order ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: 52 }}>📭</div>
              <div style={s.emptyTitle}>No order yet</div>
              <button style={s.goMenuBtn} onClick={() => setView('menu')}>Start Ordering</button>
            </div>
          ) : (
            <>
              {/* Status timeline */}
              <div style={s.statusCard}>
                <div style={s.statusTitle}>Order #{orderData.order.order_number}</div>
                <div style={s.timeline}>
                  {[
                    { key: null, label: 'Ordered', icon: '✅' },
                    { key: 'to_cook', label: 'In Queue', icon: '⏳' },
                    { key: 'preparing', label: 'Preparing', icon: '🍳' },
                    { key: 'completed', label: 'Ready!', icon: '🎉' },
                  ].map((step, i) => {
                    const kStatus = orderData.kitchen_status;
                    const stages = [null, 'to_cook', 'preparing', 'completed'];
                    const currentIdx = stages.indexOf(kStatus);
                    const stepIdx = stages.indexOf(step.key);
                    const done = stepIdx <= currentIdx || step.key === null;
                    return (
                      <div key={i} style={{ ...s.timelineStep, opacity: done ? 1 : 0.3 }}>
                        <div style={{ ...s.timelineDot, background: done ? '#facc15' : '#e2e8f0', border: '3px solid #000' }}>
                          {step.icon}
                        </div>
                        <div style={s.timelineLabel}>{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order summary */}
              <div style={s.orderSummary}>
                {orderData.order.lines?.map(l => (
                  <div key={l.id} style={s.summaryLine}>
                    <span>{Math.floor(l.quantity)}× {l.product_name}</span>
                    <span>₹{parseFloat(l.total).toFixed(0)}</span>
                  </div>
                ))}
                <div style={{ ...s.summaryLine, borderTop: '3px solid #000', paddingTop: 12, marginTop: 4 }}>
                  <span style={{ fontWeight: 900 }}>Total</span>
                  <span style={{ fontWeight: 900 }}>₹{parseFloat(orderData.order.total).toFixed(2)}</span>
                </div>
              </div>

              <button style={s.billBtn} onClick={downloadBill}>📄 Download Bill PDF</button>
              <button style={s.addMoreBtn} onClick={() => setView('menu')}>+ Add More Items</button>
              <div style={s.pollingNote}>Auto-refreshing every 8s</div>
            </>
          )}
        </div>
      )}

      {/* Floating cart button on menu view */}
      {view === 'menu' && cartCount > 0 && (
        <div style={s.floatingCart} onClick={() => setView('cart')}>
          <span>🛒 {cartCount} item{cartCount > 1 ? 's' : ''}</span>
          <span>₹{cartTotal.toFixed(0)} →</span>
        </div>
      )}
    </div>
  );
}

const globalCss = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #000; }
  ::-webkit-scrollbar-thumb { background: #facc15; }
`;

const s = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' },
  header: { background: '#000', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #facc15', position: 'sticky', top: 0, zIndex: 100 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { width: 38, height: 38, background: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#000', flexShrink: 0 },
  cafeName: { fontSize: 15, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em' },
  tableTag: { fontSize: 10, color: '#facc15', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  logoutBtn: { background: 'transparent', border: '2px solid #ef4444', color: '#ef4444', padding: '6px 14px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  tabs: { display: 'flex', background: '#000', borderBottom: '3px solid #facc15', position: 'sticky', top: 66, zIndex: 99 },
  tab: { flex: 1, padding: '12px 8px', background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 150ms', borderBottom: '3px solid transparent' },
  tabActive: { color: '#facc15', borderBottom: '3px solid #facc15' },
  menuContainer: { flex: 1, display: 'flex', flexDirection: 'column' },
  catScroll: { display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: '#fff', borderBottom: '3px solid #000', scrollbarWidth: 'none' },
  catPill: { flexShrink: 0, padding: '6px 14px', background: '#fff', border: '2px solid #000', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', transition: 'all 150ms' },
  catPillActive: { background: '#facc15', borderColor: '#000' },
  searchWrap: { padding: '12px 16px', background: '#fff', borderBottom: '2px solid #e2e8f0' },
  search: { width: '100%', padding: '10px 14px', border: '3px solid #000', background: '#f8fafc', fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'Inter, sans-serif' },
  productGrid: { padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, paddingBottom: 100 },
  productCard: { background: '#fff', border: '3px solid #000', boxShadow: '4px 4px 0 0 #000', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  productImg: { width: '100%', height: 100, objectFit: 'cover', borderBottom: '2px solid #000' },
  productBody: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  productName: { fontSize: 12, fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.3 },
  productMeta: { display: 'flex', alignItems: 'center', gap: 6 },
  productPrice: { fontSize: 15, fontWeight: 900, color: '#000' },
  taxTag: { fontSize: 9, color: '#64748b', fontWeight: 700 },
  addBtn: { padding: '8px', background: '#facc15', border: '2px solid #000', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginTop: 'auto', fontFamily: 'Inter, sans-serif', boxShadow: '2px 2px 0 0 #000' },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' },
  qtyBtn: { width: 28, height: 28, background: '#000', border: 'none', color: '#facc15', fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' },
  qtyNum: { fontSize: 15, fontWeight: 900, color: '#000', minWidth: 24, textAlign: 'center' },
  floatingCart: { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#000', border: '3px solid #facc15', color: '#facc15', padding: '16px 32px', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', gap: 16, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '4px 4px 0 0 #facc15', zIndex: 200, whiteSpace: 'nowrap' },
  cartContainer: { flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12 },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' },
  goMenuBtn: { padding: '12px 28px', background: '#facc15', border: '3px solid #000', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', boxShadow: '3px 3px 0 0 #000', fontFamily: 'Inter, sans-serif' },
  cartItems: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' },
  cartItem: { background: '#fff', border: '3px solid #000', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cartItemName: { fontSize: 13, fontWeight: 900, color: '#000', textTransform: 'uppercase', flex: 1 },
  cartItemRight: { display: 'flex', alignItems: 'center', gap: 12 },
  cartItemPrice: { fontSize: 15, fontWeight: 900, color: '#000', minWidth: 50, textAlign: 'right' },
  cartFooter: { display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '3px solid #000' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: 900, color: '#000', textTransform: 'uppercase' },
  totalValue: { fontSize: 22, fontWeight: 900, color: '#000' },
  placeBtn: { padding: '18px', background: '#facc15', border: '3px solid #000', boxShadow: '4px 4px 0 0 #000', fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  cartNote: { fontSize: 11, color: '#64748b', textAlign: 'center', fontWeight: 600 },
  errorBox: { padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '2px solid #ef4444', color: '#ef4444', fontSize: 12, fontWeight: 700 },
  statusContainer: { flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 16, paddingBottom: 32 },
  statusCard: { background: '#000', border: '4px solid #000', boxShadow: '6px 6px 0 0 #facc15', padding: '20px 24px' },
  statusTitle: { fontSize: 13, fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 },
  timeline: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  timelineStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, transition: 'opacity 300ms' },
  timelineDot: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  timelineLabel: { fontSize: 9, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' },
  orderSummary: { background: '#fff', border: '3px solid #000', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  summaryLine: { display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#000' },
  billBtn: { padding: '16px', background: '#000', border: '3px solid #facc15', color: '#facc15', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '4px 4px 0 0 #facc15' },
  addMoreBtn: { padding: '14px', background: '#fff', border: '3px solid #000', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  pollingNote: { fontSize: 10, color: '#94a3b8', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
};

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePosStore } from '../../store/posStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import styles from './POS.module.css';

export default function POSTerminal() {
  const { config_id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { activeSession, activePosConfig, activeTable, currentOrder, setSession, setPosConfig, setTable, setCurrentOrder, clearPos } = usePosStore();

  const [tab, setTab] = useState('floor');
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState('');
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [upiQr, setUpiQr] = useState(null);
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [kitchenSent, setKitchenSent] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['pos-config', config_id],
    queryFn: () => api.get(`/pos-configs/${config_id}`).then(r => r.data.data),
    onSuccess: (data) => setPosConfig(data),
  });

  const { data: session } = useQuery({
    queryKey: ['active-session', config_id],
    queryFn: () => api.get(`/sessions/active/${config_id}`).then(r => r.data.data),
    onSuccess: (data) => { if (data) setSession(data); },
  });

  const { data: floors } = useQuery({
    queryKey: ['floors'],
    queryFn: () => api.get('/floors').then(r => r.data.data),
  });

  const { data: tables } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get('/tables').then(r => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-active'],
    queryFn: () => api.get('/products', { params: { is_active: true, limit: 100 } }).then(r => r.data.data),
  });

  const { data: orderDetail, refetch: refetchOrder } = useQuery({
    queryKey: ['order-detail', currentOrder?.id],
    queryFn: () => api.get(`/orders/${currentOrder?.id}`).then(r => r.data.data),
    enabled: !!currentOrder?.id,
  });

  const { data: allOrders } = useQuery({
    queryKey: ['session-orders', activeSession?.id],
    queryFn: () => api.get('/orders', { params: { session_id: activeSession?.id, status: 'draft', limit: 100 } }).then(r => r.data.data),
    enabled: !!activeSession?.id,
    refetchInterval: 10000,
  });

  const occupiedTableIds = new Set((allOrders?.data || []).map(o => o.table_id).filter(Boolean));

  const createOrder = useMutation({
    mutationFn: ({ session_id, table_id }) => api.post('/orders', { session_id, table_id }),
    onSuccess: (res) => {
      setCurrentOrder(res.data.data);
      setKitchenSent(false);
      setTab('register');
      toast.success(`Order #${res.data.data.order_number} created`);
    },
  });

  const addLine = useMutation({
    mutationFn: ({ order_id, product_id, quantity }) => api.post(`/orders/${order_id}/lines`, { product_id, quantity }),
    onSuccess: () => refetchOrder(),
  });

  const updateLine = useMutation({
    mutationFn: ({ order_id, line_id, quantity }) => api.put(`/orders/${order_id}/lines/${line_id}`, { quantity }),
    onSuccess: () => refetchOrder(),
  });

  const removeLine = useMutation({
    mutationFn: ({ order_id, line_id }) => api.delete(`/orders/${order_id}/lines/${line_id}`),
    onSuccess: () => refetchOrder(),
  });

  const sendKitchen = useMutation({
    mutationFn: (order_id) => api.post(`/kitchen/send/${order_id}`),
    onSuccess: () => { toast.success('Sent to kitchen!'); setKitchenSent(true); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createPayment = useMutation({
    mutationFn: ({ order_id, method, amount }) => api.post('/payments', { order_id, method, amount }),
    onSuccess: async (res) => {
      const payment = res.data.data;
      setPendingPaymentId(payment.id);
      if (payMethod === 'upi') {
        const qrRes = await api.get(`/payments/upi-qr/${currentOrder.id}`);
        setUpiQr(qrRes.data.data);
        setShowUpiQr(true);
      } else {
        validatePayment.mutate(payment.id);
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Payment failed'),
  });

  const validatePayment = useMutation({
    mutationFn: (payment_id) => api.post(`/payments/${payment_id}/validate`),
    onSuccess: (res) => {
      const amount = res.data.data.payment.amount;
      setSuccessAmount(amount);
      setShowPayment(false);
      setShowUpiQr(false);
      setShowSuccess(true);
      qc.invalidateQueries(['session-orders']);
      setTimeout(() => {
        setShowSuccess(false);
        setCurrentOrder(null);
        setTable(null);
        setKitchenSent(false);
        setTab('floor');
      }, 3000);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Validation failed'),
  });

  const closeSession = useMutation({
    mutationFn: () => api.post(`/sessions/${activeSession?.id}/close`, { closing_cash: 0 }),
    onSuccess: () => { clearPos(); toast.success('Session closed'); navigate('/pos-select'); },
  });

  const handleTableClick = (table) => {
    if (!table.active) return;
    setTable(table);
    const currentSession = session || activeSession;
    if (currentSession) {
      const existingOrder = allOrders?.data?.find(o => o.table_id === table.id);
      if (existingOrder) {
        setCurrentOrder(existingOrder);
        setTab('register');
        toast.success(`Resumed Order #${existingOrder.order_number}`);
      } else {
        createOrder.mutate({ session_id: currentSession.id, table_id: table.id });
      }
    }
  };

  const handleProductClick = (product) => {
    if (!currentOrder) { toast.error('Select a table first'); return; }
    if (!product.is_active) return;
    addLine.mutate({ order_id: currentOrder.id, product_id: product.id, quantity: 1 });
  };

  const productList = Array.isArray(products) ? products : (products?.data || []);

  const filteredProducts = productList.filter(p => {
    const matchCat = activeCat === 'all' || p.category_id === Number(activeCat);
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const lines = orderDetail?.lines || [];
  const currentSession = session || activeSession;

  return (
    <div className={styles.terminal}>
      <nav className={styles.terminalNav}>
        <div className={styles.terminalNavLeft}>
          <div className={styles.terminalLogo}>C</div>
          <span className={styles.terminalName}>{config?.name || 'POS Terminal'}</span>
          <div className={styles.terminalTabs}>
            <button className={[styles.terminalTab, tab === 'floor' ? styles.terminalTabActive : ''].join(' ')} onClick={() => setTab('floor')}>
              Floor View
            </button>
            <button className={[styles.terminalTab, tab === 'register' ? styles.terminalTabActive : ''].join(' ')} onClick={() => setTab('register')}>
              Register {currentOrder ? `#${currentOrder.order_number}` : ''}
            </button>
          </div>
        </div>
        <div className={styles.terminalNavRight}>
          {currentSession && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Session Active
            </span>
          )}
          <button className={styles.terminalBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className={[styles.terminalBtn, styles.terminalBtnDanger].join(' ')} onClick={() => closeSession.mutate()}>
            Close Register
          </button>
        </div>
      </nav>

      {tab === 'floor' && (
        <div className={styles.floorView}>
          <div className={styles.floorTitle}>Select a table to start or resume an order</div>
          {(Array.isArray(floors) ? floors : floors?.data || [])?.map(floor => (
            <div key={floor.id} className={styles.floorSection}>
              <div className={styles.floorName}>{floor.name}</div>
              <div className={styles.tableGrid}>
                {(Array.isArray(tables) ? tables : tables?.data || [])?.filter(t => t.floor_id === floor.id).map(table => {
                  const occupied = occupiedTableIds.has(table.id);
                  return (
                    <div
                      key={table.id}
                      className={[styles.tableCard, occupied ? styles.tableCardOccupied : '', !table.active ? styles.tableCardInactive : ''].join(' ')}
                      onClick={() => handleTableClick(table)}
                    >
                      <div className={styles.tableNum}>T{table.table_number}</div>
                      <div className={styles.tableSeats}>{table.seats} seats</div>
                      <span className={[styles.tableStatus, occupied ? styles.tableStatusOccupied : styles.tableStatusFree].join(' ')}>
                        {occupied ? 'Occupied' : 'Free'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'register' && (
        <div className={styles.orderScreen}>
          <div className={styles.productPanel}>
            <div className={styles.categoryTabs}>
              <button className={[styles.categoryTab, activeCat === 'all' ? styles.categoryTabActive : ''].join(' ')} onClick={() => setActiveCat('all')}>
                All
              </button>
              {(Array.isArray(categories) ? categories : categories?.data || [])?.map(c => (
                <button key={c.id} className={[styles.categoryTab, activeCat === c.id ? styles.categoryTabActive : ''].join(' ')} onClick={() => setActiveCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>

            <div className={styles.productSearch}>
              <input className={styles.productSearchInput} placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className={styles.productGrid}>
              {filteredProducts?.map(p => (
                <div
                  key={p.id}
                  className={[styles.productCard, !p.is_active ? styles.productCardInactive : ''].join(' ')}
                  onClick={() => handleProductClick(p)}
                >
                  {p.image_url && (
                    <div style={{ height: 80, overflow: 'hidden', margin: '-14px -10px 10px', borderBottom: '2px solid #000' }}>
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.parentNode.style.display = 'none'} />
                    </div>
                  )}
                  <div className={styles.productCardName}>{p.name}</div>
                  <div className={styles.productCardPrice}>₹{parseFloat(p.price).toFixed(0)}</div>
                  <div className={styles.productCardTax}>{p.tax_percent}% tax</div>
                  <span className={styles.productCardCat} style={{ background: p.category_color || '#f1f5f9' }}>
                    {p.category_name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.cartPanel}>
            <div className={styles.cartHeader}>
              <span className={styles.cartTitle}>Order {currentOrder ? `#${currentOrder.order_number}` : ''}</span>
              {activeTable && <span className={styles.cartTableBadge}>Table {activeTable.table_number}</span>}
            </div>

            <div className={styles.cartItems}>
              {lines.length === 0 ? (
                <div className={styles.cartEmpty}>
                  <div className={styles.cartEmptyIcon}>◻</div>
                  <div className={styles.cartEmptyText}>No items yet</div>
                </div>
              ) : (
                lines.map(line => (
                  <div key={line.id} className={styles.cartItem}>
                    <div className={styles.cartItemInfo}>
                      <div className={styles.cartItemName}>{line.product_name}</div>
                      <div className={styles.cartItemPrice}>₹{parseFloat(line.unit_price).toFixed(0)} each</div>
                      {line.notes && <div className={styles.cartItemNote}>{line.notes}</div>}
                    </div>
                    <div className={styles.cartItemQty}>
                      <button className={styles.qtyBtn} onClick={() => {
                        if (parseInt(line.quantity) <= 1) removeLine.mutate({ order_id: currentOrder.id, line_id: line.id });
                        else updateLine.mutate({ order_id: currentOrder.id, line_id: line.id, quantity: parseInt(line.quantity) - 1 });
                      }}>−</button>
                      <span className={styles.qtyNum}>{Math.floor(line.quantity)}</span>
                      <button className={styles.qtyBtn} onClick={() => updateLine.mutate({ order_id: currentOrder.id, line_id: line.id, quantity: parseInt(line.quantity) + 1 })}>+</button>
                    </div>
                    <div className={styles.cartItemTotal}>₹{parseFloat(line.total).toFixed(0)}</div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.cartFooter}>
              <div className={styles.cartTotals}>
                <div className={styles.cartTotalRow}><span>Subtotal</span><span>₹{parseFloat(orderDetail?.subtotal || 0).toFixed(2)}</span></div>
                <div className={styles.cartTotalRow}><span>Tax</span><span>₹{parseFloat(orderDetail?.tax_amount || 0).toFixed(2)}</span></div>
                <div className={styles.cartTotalFinal}><span>Total</span><span>₹{parseFloat(orderDetail?.total || 0).toFixed(2)}</span></div>
              </div>
              <div className={styles.cartActions}>
                {kitchenSent ? (
                  <div className={styles.sentBadge}>Sent to Kitchen</div>
                ) : (
                  <button
                    className={[styles.cartBtn, styles.cartBtnSend, lines.length === 0 ? styles.cartBtnDisabled : ''].join(' ')}
                    onClick={() => currentOrder && sendKitchen.mutate(currentOrder.id)}
                    disabled={lines.length === 0 || sendKitchen.isPending}
                  >
                    Send to Kitchen
                  </button>
                )}
                <button
                  className={[styles.cartBtn, styles.cartBtnPay, lines.length === 0 ? styles.cartBtnDisabled : ''].join(' ')}
                  onClick={() => { if (lines.length > 0) setShowPayment(true); }}
                  disabled={lines.length === 0}
                >
                  Pay ₹{parseFloat(orderDetail?.total || 0).toFixed(0)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPayment && !showUpiQr && (
        <div className={styles.paymentOverlay} onClick={() => setShowPayment(false)}>
          <div className={styles.paymentModal} onClick={e => e.stopPropagation()}>
            <div className={styles.paymentHeader}>
              <span className={styles.paymentTitle}>Payment</span>
              <button className={styles.paymentClose} onClick={() => setShowPayment(false)}>✕</button>
            </div>
            <div className={styles.paymentBody}>
              <div className={styles.paymentAmount}>
                <div className={styles.paymentAmountLabel}>Amount Due</div>
                <div className={styles.paymentAmountValue}>₹{parseFloat(orderDetail?.total || 0).toFixed(0)}</div>
              </div>
              <div className={styles.paymentMethods}>
                {config?.enable_cash && (
                  <button className={[styles.paymentMethod, payMethod === 'cash' ? styles.paymentMethodActive : ''].join(' ')} onClick={() => setPayMethod('cash')}>
                    <div className={styles.paymentMethodIcon}>💵</div>
                    <div className={styles.paymentMethodLabel}>Cash</div>
                  </button>
                )}
                {config?.enable_digital && (
                  <button className={[styles.paymentMethod, payMethod === 'digital' ? styles.paymentMethodActive : ''].join(' ')} onClick={() => setPayMethod('digital')}>
                    <div className={styles.paymentMethodIcon}>💳</div>
                    <div className={styles.paymentMethodLabel}>Card</div>
                  </button>
                )}
                {config?.enable_upi && (
                  <button className={[styles.paymentMethod, payMethod === 'upi' ? styles.paymentMethodActive : ''].join(' ')} onClick={() => setPayMethod('upi')}>
                    <div className={styles.paymentMethodIcon}>📱</div>
                    <div className={styles.paymentMethodLabel}>UPI</div>
                  </button>
                )}
              </div>
              <button className={styles.paymentConfirmBtn} onClick={() => {
                if (!payMethod) { toast.error('Select payment method'); return; }
                if (!orderDetail?.lines?.length) { toast.error('Add items first'); return; }
                createPayment.mutate({ order_id: currentOrder.id, method: payMethod, amount: parseFloat(orderDetail.total) });
              }} disabled={!payMethod || createPayment.isPending}>
                {createPayment.isPending ? 'Processing...' : `Confirm ${payMethod ? payMethod.toUpperCase() : ''} Payment`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpiQr && upiQr && (
        <div className={styles.paymentOverlay}>
          <div className={styles.paymentModal}>
            <div className={styles.paymentHeader}>
              <span className={styles.paymentTitle}>Scan UPI QR</span>
            </div>
            <div className={styles.paymentBody}>
              <div className={styles.upiQr}>
                <img src={upiQr.qr} alt="UPI QR" className={styles.upiQrImage} />
                <div className={styles.upiQrId}>UPI: {upiQr.upi_id}</div>
                <div className={styles.paymentAmountValue} style={{ fontSize: 32, marginBottom: 20 }}>₹{parseFloat(upiQr.amount).toFixed(0)}</div>
                <div className={styles.upiQrBtns}>
                  <button className={[styles.cartBtn, styles.cartBtnSend].join(' ')} onClick={() => { setShowUpiQr(false); setShowPayment(false); setPendingPaymentId(null); }}>Cancel</button>
                  <button className={[styles.cartBtn, styles.cartBtnPay].join(' ')} onClick={() => validatePayment.mutate(pendingPaymentId)} disabled={validatePayment.isPending}>
                    {validatePayment.isPending ? 'Confirming...' : 'Confirmed'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className={styles.successOverlay} onClick={() => { setShowSuccess(false); setTab('floor'); }}>
          <div className={styles.successIcon}>✓</div>
          <div className={styles.successAmount}>₹{parseFloat(successAmount).toFixed(0)}</div>
          <div className={styles.successLabel}>Payment Successful</div>
          <div className={styles.successSub}>Click anywhere to continue</div>
        </div>
      )}
    </div>
  );
}
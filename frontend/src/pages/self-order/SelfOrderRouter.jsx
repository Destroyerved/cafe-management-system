import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import PhoneLogin from './PhoneLogin';
import MenuPage from './MenuPage';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' });

export default function SelfOrderRouter() {
  const { token } = useParams();
  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('customer_token'));
  const [view, setView] = useState('menu'); // 'menu' | 'status'

  const { data: tableData, isLoading, isError, error } = useQuery({
    queryKey: ['self-order-table', token],
    queryFn: () => api.get(`/self-order/${token}`).then(r => r.data.data),
    retry: false,
  });

  const handleLoginSuccess = (tok) => {
    localStorage.setItem('customer_token', tok);
    setCustomerToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    setCustomerToken(null);
  };

  if (isLoading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
      <div style={styles.loadingText}>Loading menu…</div>
    </div>
  );

  if (isError) return (
    <div style={styles.center}>
      <div style={{ fontSize: 48 }}>❌</div>
      <div style={styles.errorTitle}>Invalid or expired QR</div>
      <div style={styles.errorSub}>{error?.response?.data?.message || 'This table QR is no longer active.'}</div>
    </div>
  );

  if (!customerToken) {
    return <PhoneLogin tableData={tableData} onSuccess={handleLoginSuccess} />;
  }

  return (
    <MenuPage
      tableData={tableData}
      tableToken={token}
      customerToken={customerToken}
      onLogout={handleLogout}
    />
  );
}

const styles = {
  center: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#f1f5f9', gap: 16, fontFamily: 'Inter, sans-serif',
  },
  spinner: {
    width: 40, height: 40, border: '4px solid #e2e8f0',
    borderTop: '4px solid #facc15', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' },
  errorTitle: { fontSize: 20, fontWeight: 900, color: '#000', textTransform: 'uppercase' },
  errorSub: { fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 280 },
};

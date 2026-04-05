import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import styles from './Kitchen.module.css';

export default function KitchenSelect() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: ['open-sessions'],
    queryFn: () =>
      api.get('/sessions', { params: { status: 'open', limit: 5 } }).then(r => {
        const d = r.data.data;
        return Array.isArray(d) ? d : (d?.data || []);
      }),
    // re-check every 15s in case admin just opened a session
    refetchInterval: 15000,
  });

  // Auto-redirect to the unified kitchen display as long as a session is active
  useEffect(() => {
    if (!sessions) return;
    if (sessions.length > 0) {
      navigate('/kitchen/global', { replace: true });
    }
  }, [sessions, navigate]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { }
    clearAuth();
    navigate('/login');
    toast.success('Logged out');
  };

  // ─── Render states ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>C</div>
          <span className={styles.title}>Kitchen Display</span>
        </div>
        <div className={styles.headerRight}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {user?.name}
          </span>
          <button
            className={styles.backBtn}
            onClick={handleLogout}
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 20 }}>

        {isLoading && (
          <>
            {/* Spinner */}
            <div style={{
              width: 48, height: 48,
              border: '5px solid #e2e8f0',
              borderTop: '5px solid #facc15',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Looking for active session…
            </div>
          </>
        )}

        {!isLoading && !isError && sessions?.length === 0 && (
          <>
            <div style={{ fontSize: 40 }}>🍳</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
              No Active Session
            </div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textAlign: 'center', maxWidth: 320 }}>
              Ask the manager to open a POS session.<br />
              This screen will check again automatically every 15 seconds.
            </div>
            <div style={{
              marginTop: 12,
              padding: '10px 20px',
              background: '#fef3c7',
              border: '3px solid #000',
              fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Waiting for session…
            </div>
          </>
        )}

        {isError && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Failed to load — check connection
          </div>
        )}
      </div>
    </div>
  );
}

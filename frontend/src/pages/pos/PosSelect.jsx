import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePosStore } from '../../store/posStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import styles from './POS.module.css';

export default function PosSelect() {
  const { user, clearAuth } = useAuthStore();
  const { setSession, setPosConfig, clearPos } = usePosStore();
  const navigate = useNavigate();

  // Reset any stale pos state whenever this page mounts (after logout / fresh login)
  useEffect(() => { clearPos(); }, []);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { }
    clearAuth();
    clearPos();
    navigate('/login');
    toast.success('Logged out');
  };
  const { data: configs, isLoading } = useQuery({
    queryKey: ['pos-configs'],
    queryFn: () => api.get('/pos-configs').then(r => r.data.data),
  });

  const { data: sessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      if (!configs) return {};
      const results = {};
      for (const c of configs) {
        const res = await api.get(`/sessions/active/${c.id}`);
        results[c.id] = res.data.data;
      }
      return results;
    },
    enabled: !!configs,
  });

  const openSession = useMutation({
    mutationFn: ({ pos_config_id }) => api.post('/sessions/open', {
      pos_config_id,
      opening_cash: 1000,
    }),
    onSuccess: (res, { config }) => {
      setSession(res.data.data);
      setPosConfig(config);
      toast.success('Session opened!');
      navigate(`/pos/${config.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to open session'),
  });

  const resumeSession = (config, session) => {
    setSession(session);
    setPosConfig(config);
    navigate(`/pos/${config.id}`);
  };

  return (
    <div className={styles.selectPage}>
      <div className={styles.selectBg} />

      <div className={styles.selectContent}>
        <div className={styles.selectHeader}>
          <div className={styles.selectLogo}>C</div>
          <div>
            <div className={styles.selectTitle}>POS CAFE</div>
            <div className={styles.selectSub}>Select a terminal to begin</div>
          </div>
        </div>

        <div className={styles.selectUser}>
          <div className={styles.selectUserAvatar}>{user?.name?.[0]}</div>
          <div>
            <div className={styles.selectUserName}>{user?.name}</div>
            <div className={styles.selectUserRole}>{user?.role}</div>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.selectLoading}>Loading terminals...</div>
        ) : (
          <div className={styles.configGrid}>
            {configs?.map(config => {
              const activeSession = sessions?.[config.id];
              return (
                <div key={config.id} className={styles.configCard}>
                  <div className={styles.configIcon}>C</div>
                  <div className={styles.configName}>{config.name}</div>

                  <div className={styles.configPayments}>
                    {config.enable_cash && <span className={styles.payTag}>Cash</span>}
                    {config.enable_digital && <span className={styles.payTag}>Digital</span>}
                    {config.enable_upi && <span className={styles.payTag}>UPI</span>}
                  </div>

                  {activeSession ? (
                    <div className={styles.activeSession}>
                      <div className={styles.activeSessionDot} />
                      <div>
                        <div className={styles.activeSessionText}>Session Active</div>
                        <div className={styles.activeSessionTime}>
                          Since {new Date(activeSession.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noSession}>No active session</div>
                  )}

                  <button
                    className={styles.configBtn}
                    onClick={() => activeSession
                      ? resumeSession(config, activeSession)
                      : openSession.mutate({ pos_config_id: config.id, config })
                    }
                    disabled={openSession.isPending}
                  >
                    {activeSession ? 'Resume Session →' : 'Open Session →'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          className={styles.backBtn}
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>
        <button
          className={styles.backBtn}
          onClick={handleLogout}
          style={{ marginLeft: 8, borderColor: '#ef4444', color: '#ef4444' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
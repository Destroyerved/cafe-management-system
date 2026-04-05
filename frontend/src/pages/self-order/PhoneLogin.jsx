import { useState } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' });

export default function PhoneLogin({ tableData, onSuccess }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPreview, setOtpPreview] = useState(''); // dev only
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    if (phone.length < 10) { setError('Enter a valid 10-digit number'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/customer-auth/send-otp', { phone });
      setOtpPreview(res.data.data?.otp_preview || '');
      setStep('otp');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/customer-auth/verify-otp', { phone, otp });
      onSuccess(res.data.data.token);
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * { box-sizing: border-box; }`}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>C</div>
        <div>
          <div style={s.cafeName}>{tableData?.pos_config?.name || 'Cafe'}</div>
          <div style={s.tableLabel}>Table {tableData?.table?.table_number}</div>
        </div>
      </div>

      {/* Card */}
      <div style={s.card}>
        {step === 'phone' ? (
          <>
            <div style={s.emoji}>👋</div>
            <div style={s.title}>Welcome!</div>
            <div style={s.sub}>Enter your phone number to view the menu and order</div>

            <div style={s.field}>
              <label style={s.label}>Mobile Number</label>
              <div style={s.phoneRow}>
                <span style={s.phonePrefix}>+91</span>
                <input
                  style={s.input}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  autoFocus
                />
              </div>
            </div>

            {error && <div style={s.error}>{error}</div>}

            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={sendOtp} disabled={loading}>
              {loading ? 'Sending…' : 'Get OTP →'}
            </button>

            <div style={s.note}>No spam. Just for your order.</div>
          </>
        ) : (
          <>
            <div style={s.emoji}>📱</div>
            <div style={s.title}>Enter OTP</div>
            <div style={s.sub}>Sent to +91 {phone}</div>

            {otpPreview && (
              <div style={s.devBadge}>🛠 Dev OTP: <strong>{otpPreview}</strong></div>
            )}

            <div style={s.field}>
              <label style={s.label}>6-Digit OTP</label>
              <input
                style={{ ...s.input, fontSize: 28, letterSpacing: '0.3em', textAlign: 'center', fontWeight: 900 }}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                placeholder="——————"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                autoFocus
              />
            </div>

            {error && <div style={s.error}>{error}</div>}

            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={verifyOtp} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & View Menu →'}
            </button>

            <button style={s.back} onClick={() => { setStep('phone'); setOtp(''); setError(''); }}>
              ← Change number
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', background: '#000', display: 'flex',
    flexDirection: 'column', fontFamily: "'Inter', sans-serif",
  },
  header: {
    background: '#000', padding: '20px 24px', display: 'flex',
    alignItems: 'center', gap: 14, borderBottom: '3px solid #facc15',
  },
  logo: {
    width: 44, height: 44, background: '#facc15', border: '3px solid #facc15',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 900, color: '#000', flexShrink: 0,
  },
  cafeName: { fontSize: 16, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em' },
  tableLabel: { fontSize: 11, color: '#facc15', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 },
  card: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 24px', gap: 16, maxWidth: 440, width: '100%', margin: '0 auto',
  },
  emoji: { fontSize: 52, lineHeight: 1 },
  title: { fontSize: 28, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em', textAlign: 'center' },
  sub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', fontWeight: 500, lineHeight: 1.5 },
  field: { width: '100%', display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' },
  phoneRow: { display: 'flex', border: '3px solid #facc15', background: '#111', width: '100%' },
  phonePrefix: {
    padding: '14px 14px', fontSize: 16, fontWeight: 700, color: '#facc15',
    borderRight: '2px solid #facc15', flexShrink: 0,
  },
  input: {
    flex: 1, background: '#111', border: 'none', outline: 'none', padding: '14px 16px',
    fontSize: 18, fontWeight: 700, color: '#fff', width: '100%',
    borderTop: '3px solid #facc15', borderRight: '3px solid #facc15', borderBottom: '3px solid #facc15', borderLeft: 'none',
  },
  btn: {
    width: '100%', padding: '18px', background: '#facc15', border: '3px solid #facc15',
    color: '#000', fontSize: 14, fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.06em', cursor: 'pointer', marginTop: 8,
    boxShadow: '4px 4px 0 0 rgba(250,204,21,0.3)', fontFamily: 'Inter, sans-serif',
  },
  back: {
    background: 'none', border: 'none', color: '#64748b', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  },
  note: { fontSize: 11, color: '#475569', textAlign: 'center' },
  error: {
    width: '100%', padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
    border: '2px solid #ef4444', color: '#ef4444', fontSize: 12, fontWeight: 700,
  },
  devBadge: {
    width: '100%', padding: '10px 14px', background: 'rgba(250,204,21,0.1)',
    border: '2px solid #facc15', color: '#facc15', fontSize: 13, fontWeight: 600,
    textAlign: 'center',
  },
};

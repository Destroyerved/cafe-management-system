import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import styles from './Auth.module.css';

const DEMO_CREDS = [
  { label: 'Admin', email: 'admin@pos-cafe.com', password: 'Admin@1234' },
  { label: 'Staff', email: 'raj@pos-cafe.com', password: 'Staff@1234' },
  { label: 'Kitchen', email: 'arjun@pos-cafe.com', password: 'Kitchen@1234' },
];

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const fillDemo = (cred) => {
    setValue('email', cred.email);
    setValue('password', cred.password);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, user } = res.data.data;
      setAuth({ accessToken, user });
      toast.success('Welcome back, ' + user.name);
      if (user.role === 'admin') navigate('/dashboard');
      else if (user.role === 'kitchen') navigate('/kitchen-select');
      else navigate('/pos-select');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const togglePass = () => setShowPass(p => !p);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logoRow}>
            <div className={styles.logoIcon}>C</div>
            <span className={styles.title}>POS Cafe</span>
          </div>
          <p className={styles.sub}>Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email Address</label>
            <input
              {...register('email')}
              type="email"
              placeholder="admin@pos-cafe.com"
              className={[styles.input, errors.email ? styles.inputError : ''].join(' ')}
            />
            {errors.email && <span className={styles.error}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.passWrap}>
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                className={[styles.input, errors.password ? styles.inputError : ''].join(' ')}
              />
              <button type="button" className={styles.eye} onClick={togglePass}>
                {showPass ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {errors.password && <span className={styles.error}>{errors.password.message}</span>}
          </div>

          <button type="submit" disabled={loading} className={styles.btn}>
            {loading ? <span className={styles.spinner} /> : 'Sign In'}
          </button>
        </form>

        <div className={styles.demoSection}>
          <div className={styles.demoLabel}>Demo Credentials</div>
          <div className={styles.demoBtns}>
            {DEMO_CREDS.map(c => (
              <button key={c.label} type="button" className={styles.demoBtn} onClick={() => fillDemo(c)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.switch}>
          No account?{' '}
          <Link to="/signup" className={styles.switchLink}>Sign up here</Link>
        </p>
      </div>
    </div>
  );
}
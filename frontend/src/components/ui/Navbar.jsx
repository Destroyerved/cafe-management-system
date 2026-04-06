import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import styles from './Navbar.module.css';


export default function Navbar({ links = [] }) {
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();


  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    clearAuth();
    navigate('/login');
    toast.success('Logged out');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <span className={styles.logo}>☕ POS Cafe</span>
        <div className={styles.links}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={styles.link}>{l.label}</Link>
          ))}
        </div>
      </div>
      <div className={styles.right}>
        <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <span className={styles.user}>{user?.name}</span>
        <button className={styles.logout} onClick={handleLogout}>Logout</button>
      </div>

    </nav>
  );
}

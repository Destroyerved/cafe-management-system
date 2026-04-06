import { useThemeStore } from '../../store/themeStore';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button 
      className={styles.themeToggle} 
      onClick={toggleTheme} 
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label="Toggle Theme"
    >
      <span className={styles.icon}>
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

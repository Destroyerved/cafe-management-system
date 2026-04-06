import { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePosStore } from '../../store/posStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import ThemeToggle from '../../components/ui/ThemeToggle';
import styles from './Dashboard.module.css';


import Overview from './pages/Overview';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Floors from './pages/Floors';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import Reports from './pages/Reports';

const NAV = [
    { to: '', label: 'Overview' },
    { to: 'orders', label: 'Orders' },
    { to: 'products', label: 'Products' },
    { to: 'categories', label: 'Categories' },
    { to: 'floors', label: 'Floors' },
    { to: 'customers', label: 'Customers' },
    { to: 'staff', label: 'Staff' },
    { to: 'reports', label: 'Reports' },
];

export default function DashboardPage() {
    const { user, clearAuth } = useAuthStore();
    const { clearPos } = usePosStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch { }
        clearAuth();
        clearPos();          // clear stale session/pos config so PosSelect starts fresh
        navigate('/login');
        toast.success('Logged out');
    };

    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandIcon}>C</div>
                    <span className={styles.brandName}>POS CAFE</span>
                </div>

                <nav className={styles.nav}>
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to === '' ? '/dashboard' : `/dashboard/${item.to}`}
                            end={item.to === ''}
                            className={({ isActive }) =>
                                [styles.navItem, isActive ? styles.navActive : ''].join(' ')
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.headerRight}>
                    <ThemeToggle />
                    <div className={styles.userBadge}>
                        <div className={styles.userAvatar}>
                            {user?.name?.[0]?.toUpperCase()}
                        </div>
                        <span className={styles.userName}>{user?.name}</span>
                    </div>

                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className={styles.main}>
                <Routes>
                    <Route index element={<Overview />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="products" element={<Products />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="floors" element={<Floors />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="staff" element={<Staff />} />
                    <Route path="reports" element={<Reports />} />
                </Routes>
            </main>
        </div>
    );
}
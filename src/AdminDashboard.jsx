
import React, { useState, useEffect } from 'react';
import {
  Package, ShoppingCart, Truck, Tag, Grid,
  Menu, X, LogOut, BarChart3, Image, Bell, Search,
  ChevronRight, Home, Star, ShoppingBag, Layers, Upload, Calendar
} from 'lucide-react';
import ProductsHub      from './pages/ProductsHub';
import OrderManager     from './pages/OrderManager';
import ShippingManager  from './pages/ShippingManager';
import DiscountManager  from './pages/DiscountManager';
import CategoryManager  from './pages/CategoryManager';
import HomepageManager  from './pages/HomepageManager';
import Analytics        from './pages/Analytics';
import ReviewManager    from './pages/ReviewManager';
import BazaarPOS        from './pages/BazaarPOS';
import StockManager     from './pages/Stockmanager';
import ContentPlanner   from './pages/ContentPlanner';

// ── Design tokens ─────────────────────────────────────────────────────────────
const DARK  = '#1E1023';
const PINK  = '#F472B6';
const ROSE  = '#BE185D';
const PALE  = '#FFF0F6';
const MID   = '#6B4A6E';
const LIGHT = '#D8B4D8';
const CREAM = '#FCE7F3';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

// ── Full navigation (admin sees all) ─────────────────────────────────────────
const ALL_NAV = [
  { id: 'analytics',  name: 'Dashboard',   icon: BarChart3   },
  { id: 'products',   name: 'Products',    icon: Package     },
  { id: 'orders',     name: 'Orders',      icon: ShoppingCart },
  { id: 'categories', name: 'Categories',  icon: Grid        },
  { id: 'discounts',  name: 'Discounts',   icon: Tag         },
  { id: 'shipping',   name: 'Shipping',    icon: Truck       },
  { id: 'homepage',   name: 'Homepage',    icon: Image       },
  { id: 'reviews',    name: 'Reviews',     icon: Star        },
  { id: 'content',    name: 'Content Planner', icon: Calendar },
  { id: 'bazaar',     name: 'Bazaar',      icon: ShoppingBag },
  { id: 'stock',      name: 'Stock',       icon: Layers      },
];

// ── Employee navigation ───────────────────────────────────────────────────────
const employeeNav = (store) => [
  { id: 'bazaar', name: store === 'sabeel' ? '🏪 Sabeel POS' : '☁️ Clouds Tex POS', icon: ShoppingBag },
  { id: 'stock',  name: '📦 Stock View', icon: Layers },
];

// ── Full admin CSS ────────────────────────────────────────────────────────────
const ADMIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');

  .admin-root * { box-sizing: border-box; }
  .admin-root { font-family: 'Montserrat', sans-serif; }

  /* ── Sidebar ── */
  .admin-sidebar {
    width: 240px;
    height: 100vh;
    position: sticky; top: 0;
    background: #1E1023;
    display: flex; flex-direction: column;
    flex-shrink: 0; z-index: 10;
  }
  .admin-logo-area {
    padding: 24px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .admin-logo-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.5rem; font-weight: 700;
    color: #fff; letter-spacing: 0.04em;
  }
  .admin-logo-sub {
    font-size: 0.65rem; font-weight: 600;
    color: #D8B4D8; letter-spacing: 0.18em;
    text-transform: uppercase; margin-top: 2px;
  }
  .admin-nav {
    flex: 1; padding: 12px 10px;
    display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto;
  }
  .admin-nav::-webkit-scrollbar { width: 4px; }
  .admin-nav::-webkit-scrollbar-track { background: transparent; }
  .admin-nav::-webkit-scrollbar-thumb { background: #6B4A6E; border-radius: 10px; }
  .admin-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 10px;
    color: #D8B4D8; font-size: 0.85rem; font-weight: 500;
    cursor: pointer; border: none; background: none;
    width: 100%; text-align: left;
    transition: all 0.2s ease;
    font-family: 'Montserrat', sans-serif;
  }
  .admin-nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
  .admin-nav-item.active {
    background: linear-gradient(135deg, #BE185D, #9d174d);
    color: #fff;
    box-shadow: 0 4px 12px rgba(190,24,93,0.35);
  }
  .admin-nav-item svg { flex-shrink: 0; }

  /* ── User area ── */
  .admin-user-area {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .admin-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, #F472B6, #fb7185);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
  }
  .admin-user-name { color: #fff; font-size: 0.82rem; font-weight: 600; }
  .admin-user-role { color: #D8B4D8; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; }

  /* ── Logout ── */
  .admin-logout-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 14px; border-radius: 8px;
    color: #D8B4D8; font-size: 0.82rem; font-weight: 500;
    cursor: pointer; border: none; background: none;
    width: 100%; transition: all 0.2s;
    font-family: 'Montserrat', sans-serif;
  }
  .admin-logout-btn:hover { background: rgba(244,63,94,0.12); color: #f87171; }

  /* ── Header ── */
  .admin-header {
    height: 64px; background: #fff;
    border-bottom: 1px solid #fce7f3;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px;
    box-shadow: 0 1px 8px rgba(190,24,93,0.06);
    position: sticky; top: 0; z-index: 5;
  }
  .admin-page-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem; font-weight: 700; color: #1E1023;
  }
  .admin-breadcrumb {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.75rem; color: #6B4A6E; margin-top: 2px;
  }
  .admin-header-actions { display: flex; align-items: center; gap: 8px; }
  .admin-icon-btn {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #FCE7F3; background: #FFF0F6;
    color: #6B4A6E; cursor: pointer; transition: all 0.2s;
  }
  .admin-icon-btn:hover { background: #FCE7F3; color: #BE185D; border-color: #f9a8d4; }

  /* ── Main ── */
  .admin-main {
    flex: 1; background: #FFF0F6;
    overflow-y: auto; padding: 28px;
  }

  /* ── Component theme overrides ── */
  .admin-main .bg-white {
    border: 1px solid rgba(244,114,182,0.15) !important;
    box-shadow: 0 2px 16px rgba(190,24,93,0.06) !important;
    border-radius: 16px !important;
  }
  .admin-main thead.text-xs th,
  .admin-main thead th { background: #fdf2f8 !important; color: #6B4A6E !important; }
  .admin-main .bg-indigo-600,
  .admin-main .bg-indigo-700 { background: linear-gradient(135deg, #BE185D, #9d174d) !important; }
  .admin-main .hover\\:bg-indigo-700:hover { background: #9d174d !important; }
  .admin-main .text-indigo-600 { color: #BE185D !important; }
  .admin-main .focus\\:border-indigo-500:focus { border-color: #f9a8d4 !important; }
  .admin-main .focus\\:ring-indigo-500:focus { --tw-ring-color: rgba(244,114,182,0.25) !important; }
  .admin-main .bg-indigo-50 { background: #FFF0F6 !important; }
  .admin-main .text-indigo-700 { color: #BE185D !important; }
  .admin-main .border-indigo-600 { border-color: #BE185D !important; }
  .admin-main .bg-indigo-100 { background: #FCE7F3 !important; }
  .admin-main .text-indigo-800 { color: #9d174d !important; }
  .admin-main .bg-purple-100 { background: #FCE7F3 !important; }
  .admin-main .text-purple-700 { color: #BE185D !important; }

  /* ── Mobile overlay ── */
  .admin-mobile-overlay {
    position: fixed; inset: 0;
    background: rgba(30,16,35,0.6);
    backdrop-filter: blur(3px);
    z-index: 9; display: none;
  }
  .admin-mobile-overlay.visible { display: block; }

  /* ── Login ── */
  .admin-login-wrap {
    min-height: 100vh; background: #1E1023;
    display: flex; align-items: center; justify-content: center; padding: 2rem;
    background-image:
      radial-gradient(circle at 20% 80%, rgba(244,114,182,0.12) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(190,24,93,0.08) 0%, transparent 50%);
  }
  .admin-login-card {
    background: rgba(255,255,255,0.97); border-radius: 20px;
    padding: 40px 36px; width: 100%; max-width: 400px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.4);
  }
  .admin-login-logo {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2.2rem; font-weight: 700;
    color: #1E1023; letter-spacing: 0.04em;
    text-align: center; margin-bottom: 4px;
  }
  .admin-login-sub {
    text-align: center; color: #6B4A6E; font-size: 0.82rem;
    margin-bottom: 28px; text-transform: uppercase; letter-spacing: 0.12em;
  }
  .admin-login-label {
    display: block; font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: #6B4A6E; margin-bottom: 6px;
  }
  .admin-login-input {
    width: 100%; padding: 11px 14px;
    border: 1.5px solid #e5e7eb; border-radius: 10px;
    font-size: 0.9rem; font-family: 'Montserrat', sans-serif;
    outline: none; color: #1E1023;
    transition: border-color 0.2s; margin-bottom: 16px;
  }
  .admin-login-input:focus {
    border-color: #F472B6;
    box-shadow: 0 0 0 3px rgba(244,114,182,0.12);
  }
  .admin-login-btn {
    width: 100%; padding: 13px;
    background: linear-gradient(135deg, #F472B6, #BE185D);
    color: #fff; border: none; border-radius: 10px;
    font-size: 0.88rem; font-weight: 700; cursor: pointer;
    font-family: 'Montserrat', sans-serif;
    letter-spacing: 0.06em; text-transform: uppercase;
    box-shadow: 0 4px 16px rgba(244,114,182,0.35);
    transition: all 0.2s; margin-top: 4px;
  }
  .admin-login-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(244,114,182,0.45);
  }
  .admin-login-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .admin-login-error {
    background: #fee2e2; border: 1px solid #fca5a5;
    color: #991b1b; padding: 10px 14px; border-radius: 8px;
    font-size: 0.84rem; margin-bottom: 16px;
  }

  /* ── Mobile responsive ── */
  @media (max-width: 768px) {
    .admin-sidebar {
      position: fixed !important;
      left: 0; top: 0; width: 240px; height: 100vh;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 200;
    }
    .admin-sidebar.mobile-open { transform: translateX(0); }
    .admin-main { padding: 16px; width: 100%; }
    .admin-header { padding: 0 16px; }
    .admin-root { display: block !important; }
  }
`;

// ── Main component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [loginError,   setLoginError]   = useState('');
  const [activePage,   setActivePage]   = useState('analytics');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [pendingOrders,setPendingOrders]= useState(0);
  const [userRole,     setUserRole]     = useState(null);
  const [userStore,    setUserStore]    = useState(null);

  // Inject CSS once
  useEffect(() => {
    if (!document.getElementById('siraj-admin-styles')) {
      const style = document.createElement('style');
      style.id = 'siraj-admin-styles';
      style.textContent = ADMIN_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // Auto-verify token on load
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) verifyToken(token);
  }, []);

  // Pending orders badge (admin only)
  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') return;
    fetch(`${API_BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(r => r.json())
      .then(data => {
        const orders = Array.isArray(data) ? data : [];
        setPendingOrders(orders.filter(o => o.status === 'Pending').length);
      })
      .catch(() => {});
  }, [isAuthenticated, activePage, userRole]);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUserRole(data.user?.role || 'admin');
        setUserStore(data.user?.store || null);
        setActivePage(data.user?.role !== 'admin' ? 'bazaar' : 'analytics');
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch {
      localStorage.removeItem('adminToken');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      // Try employee login first
      let res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password })
      });
      let data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        setUserRole(data.role);
        setUserStore(data.store || null);
        setActivePage(data.role !== 'admin' ? 'bazaar' : 'analytics');
        setUsername(''); setPassword('');
        setLoading(false);
        return;
      }
      // Fallback to admin login
      res  = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password })
      });
      data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        setUserRole('admin');
        setUserStore(null);
        setActivePage('analytics');
        setUsername(''); setPassword('');
      } else {
        setLoginError(data.message || 'Invalid username or password');
      }
    } catch {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserStore(null);
    setActivePage('analytics');
  };

  const navigate = (id) => { setActivePage(id); setSidebarOpen(false); };

  const renderPage = () => {
    switch (activePage) {
      case 'analytics':  return <Analytics />;
      case 'products':   return <ProductsHub />;
      case 'orders':     return <OrderManager />;
      case 'shipping':   return <ShippingManager />;
      case 'discounts':  return <DiscountManager />;
      case 'categories': return <CategoryManager />;
      case 'homepage':   return <HomepageManager />;
      case 'reviews':    return <ReviewManager />;
      case 'content':    return <ContentPlanner />;
      case 'bazaar':     return <BazaarPOS userRole={userRole} userStore={userStore} />;
      case 'stock':      return (
        <StockManager
          readOnly={userRole !== 'admin'}
          userStore={userRole === 'admin' ? null : userStore}
        />
      );
      default: return <Analytics />;
    }
  };

  const navItems    = userRole === 'admin' ? ALL_NAV : employeeNav(userStore);
  const currentNav  = navItems.find(n => n.id === activePage);
  const avatarLetter = userRole === 'admin' ? 'A' : userStore === 'sabeel' ? 'S' : 'C';
  const storeName   = userRole === 'admin'
    ? 'Candles & Care · Admin'
    : userStore === 'sabeel' ? 'Sabeel Elrashad Store' : 'Clouds Tex Store';

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-card">
          <div className="admin-login-logo">Siraj</div>
          <div className="admin-login-sub">Admin &amp; Employee Access</div>
          {loginError && <div className="admin-login-error">{loginError}</div>}
          <form onSubmit={handleLogin}>
            <label className="admin-login-label">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="admin-login-input" placeholder="Enter your username"
              required disabled={loading} autoComplete="username" />
            <label className="admin-login-label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="admin-login-input" placeholder="Enter your password"
              required disabled={loading} autoComplete="current-password" />
            <button type="submit" disabled={loading} className="admin-login-btn">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.75rem', color: '#6B4A6E' }}>
            Secure access · Siraj Candles
          </p>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  return (
    <div className="admin-root" style={{ display: 'flex', minHeight: '100vh', background: '#FFF0F6' }}>

      {/* Mobile overlay */}
      <div
        className={`admin-mobile-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="admin-logo-area">
          <div className="admin-logo-name">Siraj</div>
          <div className="admin-logo-sub">{storeName}</div>
        </div>

        <nav className="admin-nav">
          {navItems.map(item => {
            const Icon     = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={16} />
                <span>{item.name}</span>
                {item.id === 'orders' && pendingOrders > 0 && (
                  <span style={{
                    marginLeft: 'auto', background: '#F472B6', color: '#fff',
                    borderRadius: 20, padding: '1px 8px',
                    fontSize: '0.68rem', fontWeight: 700,
                  }}>{pendingOrders}</span>
                )}
              </button>
            );
          })}

          <button className="admin-logout-btn" onClick={handleLogout} style={{ marginTop: 'auto' }}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </nav>

        <div className="admin-user-area">
          <div className="admin-avatar">{avatarLetter}</div>
          <div>
            <div className="admin-user-name">
              {userRole === 'admin' ? 'Admin' : userStore === 'sabeel' ? 'Sabeel Staff' : 'Clouds Tex Staff'}
            </div>
            <div className="admin-user-role">
              {userRole === 'admin' ? 'Owner' : 'Store Employee'}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="admin-icon-btn"
              onClick={() => setSidebarOpen(s => !s)}
              id="admin-hamburger"
              style={{ display: 'none' }}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="admin-page-title">{currentNav?.name || 'Dashboard'}</div>
              <div className="admin-breadcrumb">
                <Home size={11} />
                <ChevronRight size={11} />
                <span>{currentNav?.name || 'Dashboard'}</span>
              </div>
            </div>
          </div>

          <div className="admin-header-actions">
            {pendingOrders > 0 && (
              <button
                className="admin-icon-btn"
                title={`${pendingOrders} pending orders`}
                onClick={() => navigate('orders')}
                style={{ position: 'relative' }}
              >
                <Bell size={16} />
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#BE185D', color: '#fff', borderRadius: '50%',
                  width: 16, height: 16, fontSize: '0.6rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{pendingOrders}</span>
              </button>
            )}
            <button
              className="admin-icon-btn"
              title="View website"
              onClick={() => window.open('https://sirajcare.com', '_blank')}
            >
              <Search size={16} />
            </button>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #F472B6, #fb7185)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.82rem',
            }}>{avatarLetter}</div>
          </div>
        </header>

        <main className="admin-main">
          {renderPage()}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #admin-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export { AdminDashboard };

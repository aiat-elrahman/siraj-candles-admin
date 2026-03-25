import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, Truck, Tag, LifeBuoy, Grid, Menu, X, LogOut, Upload, Eye, BarChart3, Settings, Image } from 'lucide-react';
import ProductManager from './pages/ProductManager';
import OrderManager from './pages/OrderManager';
import ShippingManager from './pages/ShippingManager';
import DiscountManager from './pages/DiscountManager';
import CareManager from './pages/CareManager';
import CategoryManager from './pages/CategoryManager';
import HeroManager from './pages/HeroManager';
import Analytics from './pages/Analytics';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activePage, setActivePage] = useState('products');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'https://siraj-backend.onrender.com';

  // Check if already logged in on component mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/verify`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('adminToken');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        setLoginError('');
        setUsername('');
        setPassword('');
      } else {
        setLoginError(data.message || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setActivePage('products');
    setUsername('');
    setPassword('');
  };

  const navigation = [
    { id: 'products', name: 'Products', icon: Package },
    { id: 'orders', name: 'Orders', icon: ShoppingCart },
    { id: 'shipping', name: 'Shipping', icon: Truck },
    { id: 'discounts', name: 'Discounts', icon: Tag },
    { id: 'care', name: 'Product Care', icon: LifeBuoy },
    { id: 'categories', name: 'Categories', icon: Grid },
    { id: 'hero', name: 'Hero Section', icon: Image },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'products':
        return <ProductManager />;
      case 'orders':
        return <OrderManager />;
      case 'shipping':
        return <ShippingManager />;
      case 'discounts':
        return <DiscountManager />;
      case 'care':
        return <CareManager />;
      case 'categories':
        return <CategoryManager />;
      case 'hero':
        return <HeroManager />;
      case 'analytics':
        return <Analytics />;
      default:
        return <ProductManager />;
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Siraj Admin</h1>
            <p className="text-gray-600 mt-2">Please sign in to continue</p>
          </div>
          
          {loginError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Secure admin access only</p>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard (Authenticated)
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <div>
            <h1 className="text-xl font-bold">Siraj Admin</h1>
            <p className="text-xs text-indigo-200 mt-1">Dashboard</p>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden hover:bg-indigo-500 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActivePage(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout button at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 mr-2" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden md:block">
                <h2 className="text-xl font-semibold text-gray-800 capitalize">
                  {navigation.find(item => item.id === activePage)?.name || 'Dashboard'}
                </h2>
              </div>
            </div>
            
            {/* Admin info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">AD</span>
                </div>
                <span className="text-sm text-gray-700 hidden md:block">Admin</span>
              </div>
            </div>
          </div>
          
          {/* Mobile page title */}
          <div className="md:hidden px-4 pb-3">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {navigation.find(item => item.id === activePage)?.name || 'Dashboard'}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="animate-fadeIn">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export { AdminDashboard };
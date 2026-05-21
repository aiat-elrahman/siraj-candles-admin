import React, { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Users, DollarSign, ShoppingCart, Package, Wallet, QrCode, Globe, Store } from 'lucide-react';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    conversionRate: 0,
    abandonedCart: 0,
    bazaarRevenue: 0,
    webRevenue: 0,
    cashVault: 0,
    instapayVault: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'https://siraj-backend.onrender.com';

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
      
      // Fetch recent orders
      const ordersResponse = await fetch(`${API_BASE_URL}/api/orders?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ordersData = await ordersResponse.json();
      setRecentOrders(ordersData.orders || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Shared Design Color Tokens
  const DARK = '#1E1023';
  const ROSE = '#BE185D';
  const MID  = '#6B4A6E';

  return (
    <div className="space-y-6 admin-root">
      
      {/* ── OVERALL HIGHLIGHT METRICS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Combined Revenue</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{(stats.totalRevenue || 0).toFixed(2)} EGP</p>
            </div>
            <div className="bg-green-500 p-3 rounded-xl text-white shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalOrders}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-xl text-white shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Active Catalog items</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalProducts}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-xl text-white shadow-sm">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Web Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.conversionRate}%</p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-xl text-white shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── CHANNEL SPLIT ANALYTICS (WEB VS BAZAAR) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" /> Online Web Store Revenue
          </h3>
          <p className="text-3xl font-extrabold text-gray-800">{(stats.webRevenue || 0).toFixed(2)} EGP</p>
          <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ 
              width: `${stats.totalRevenue > 0 ? (stats.webRevenue / stats.totalRevenue) * 100 : 0}%`,
              background: `linear-gradient(135deg, ${ROSE}, #9d174d)`
            }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Accounts for {stats.totalRevenue > 0 ? ((stats.webRevenue / stats.totalRevenue) * 100).toFixed(0) : 0}% of global sales volume.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-purple-500" /> Ground Floor Bazaar Revenue
          </h3>
          <p className="text-3xl font-extrabold text-gray-800">{(stats.bazaarRevenue || 0).toFixed(2)} EGP</p>
          <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ 
              width: `${stats.totalRevenue > 0 ? (stats.bazaarRevenue / stats.totalRevenue) * 100 : 0}%`,
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)'
            }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Accounts for {stats.totalRevenue > 0 ? ((stats.bazaarRevenue / stats.totalRevenue) * 100).toFixed(0) : 0}% of global sales volume.
          </p>
        </div>
      </div>

      {/* ── BAZAAR ACCOUNTANT FINANCIAL VAULTS SPLIT ── */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          💰 Bazaar POS Vault Breakdown (For Accountant Audit)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-green-200 bg-green-50/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-700 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Reconciled Cash Box
              </span>
              <p className="text-2xl font-black text-gray-800 mt-1">{(stats.cashVault || 0).toFixed(2)} EGP</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> Verified InstaPay Transfers
              </span>
              <p className="text-2xl font-black text-gray-800 mt-1">{(stats.instapayVault || 0).toFixed(2)} EGP</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADDITIONAL WEB METRICS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Cart Abandonment</h3>
            <ShoppingCart className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-gray-800">{stats.abandonedCart || 0}</p>
            <p className="text-xs text-gray-400 font-medium mt-1">Pending Web checkouts</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Customer Metrics</h3>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-center py-2">
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCustomers || 0}</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Unique Clients</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalCustomers > 0 ? (stats.totalOrders / stats.totalCustomers).toFixed(1) : 0}
              </p>
              <p className="text-xs text-gray-400 font-medium mt-1">Avg Orders / Buyer</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT WEB INVOICES TABLE ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-pink-100">
        <div className="px-6 py-4 border-b border-pink-50 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Incoming Web Channel Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-pink-50/30 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Total Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400 italic">
                    No web purchases registered yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-pink-50/10 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-900 font-bold">
                      #{order._id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {order.customerInfo?.name || 'Guest Checkout'}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {order.totalAmount} EGP
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
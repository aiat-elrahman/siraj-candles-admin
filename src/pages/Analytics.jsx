import React, { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Users, DollarSign, Eye, ShoppingCart, CheckCircle, Package } from 'lucide-react';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    conversionRate: 0,
    abandonedCart: 0
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

  const statCards = [
    { title: 'Total Revenue', value: `${stats.totalRevenue.toFixed(0)} EGP`, icon: DollarSign, color: 'bg-green-500' },
    { title: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'bg-blue-500' },
    { title: 'Total Products', value: stats.totalProducts, icon: Package, color: 'bg-purple-500' },
    { title: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'bg-yellow-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Cart Abandonment</h3>
            <ShoppingCart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800">{stats.abandonedCart || 0}</p>
            <p className="text-gray-500 mt-1">Abandoned Carts</p>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Recovery Rate</span>
              <span className="font-semibold text-gray-800">0%</span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Customer Stats</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.totalCustomers || 0}</p>
              <p className="text-gray-500 text-sm">Total Customers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalCustomers > 0 ? (stats.totalOrders / stats.totalCustomers).toFixed(1) : 0}
              </p>
              <p className="text-gray-500 text-sm">Avg Orders/Customer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No orders yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      #{order._id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.customerInfo?.name || 'Guest'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {order.totalAmount} EGP
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Facebook Pixel Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-800 mb-2">Facebook Pixel Setup</h4>
        <p className="text-blue-700 text-sm mb-3">
          To track Facebook ads, add your Pixel ID in the website's HTML files:
        </p>
        <code className="block bg-white p-3 rounded text-sm font-mono text-gray-700 overflow-x-auto">
          fbq('init', 'YOUR_PIXEL_ID_HERE');
        </code>
        <p className="text-blue-700 text-sm mt-3">
          Events are automatically tracked: PageView, AddToCart, and Purchase.
        </p>
      </div>
    </div>
  );
};

export default Analytics;
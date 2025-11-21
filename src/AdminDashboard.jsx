import React, { useState } from 'react';
import { Package, ShoppingCart, Truck, Tag, LifeBuoy, Grid, Menu, X } from 'lucide-react';

// Import all the pages we'll create
import ProductManager from './pages/ProductManager';
import OrderManager from './pages/OrderManager';
import ShippingManager from './pages/ShippingManager';
import DiscountManager from './pages/DiscountManager';
import CareManager from './pages/CareManager';
import CategoryManager from './pages/CategoryManager';

const AdminDashboard = () => {
  const [activePage, setActivePage] = useState('products');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: 'products', name: 'Products', icon: Package },
    { id: 'orders', name: 'Orders', icon: ShoppingCart },
    { id: 'shipping', name: 'Shipping', icon: Truck },
    { id: 'discounts', name: 'Discounts', icon: Tag },
    { id: 'care', name: 'Product Care', icon: LifeBuoy },
    { id: 'categories', name: 'Categories', icon: Grid },
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
      default:
        return <ProductManager />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 flex z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-4 bg-indigo-600 text-white">
          <h1 className="text-xl font-bold">Siraj Admin</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActivePage(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors
                      ${activePage === item.id 
                        ? 'bg-indigo-100 text-indigo-700 border-l-4 border-indigo-500' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold text-gray-800 capitalize">
                {navigation.find(item => item.id === activePage)?.name || 'Dashboard'}
              </h2>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export { AdminDashboard };  
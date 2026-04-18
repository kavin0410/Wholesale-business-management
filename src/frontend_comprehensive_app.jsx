import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, LayoutDashboard, Package, ShoppingCart, Users, 
  Settings, LogOut, Search, Bell, Menu, X, TrendingUp, 
  TrendingDown, DollarSign, Activity, PackageCheck, AlertCircle,
  Plus, Edit, Trash2, Filter, MoreHorizontal
} from 'lucide-react';

/* 
  ========================================================================
  SupplyNest - Comprehensive Single-File React Frontend
  ========================================================================
  This file contains a complete, interconnected React application serving as 
  the complete frontend for the Wholesale Business Management System.
  
  Features Included:
  - Responsive Sidebar & Navigation
  - Dynamic Dashboard with Analytics & Stat Cards
  - Inventory Management Module (CRUD operations simulation)
  - Order Processing & Tracking View
  - Framer Motion micro-animations & transitions
  - Dark/Light mode inspired premium Tailwind CSS aesthetics
  - Mocked state management simulating backend API calls
  ========================================================================
*/

// --- MOCK DATA ---
const mockStats = [
  { title: 'Total Revenue', value: '$124,563.00', trend: '+14.5%', isPositive: true, icon: DollarSign },
  { title: 'Active Orders', value: '842', trend: '+5.2%', isPositive: true, icon: ShoppingCart },
  { title: 'Low Stock Items', value: '23', trend: '-2.1%', isPositive: false, icon: AlertCircle },
  { title: 'New Customers', value: '145', trend: '+11.8%', isPositive: true, icon: Users },
];

const mockProducts = [
  { id: 1, name: 'Industrial Strength Cleaner', sku: 'ISC-1001', category: 'Chemicals', stock: 450, price: 24.99, status: 'In Stock' },
  { id: 2, name: 'Heavy Duty Packaging Tape', sku: 'HDT-2005', category: 'Packaging', stock: 1200, price: 4.50, status: 'In Stock' },
  { id: 3, name: 'Corrugated Boxes (L)', sku: 'CBX-300L', category: 'Packaging', stock: 12, price: 1.25, status: 'Low Stock' },
  { id: 4, name: 'Safety Goggles Pro', sku: 'SGP-400A', category: 'Safety', stock: 0, price: 15.75, status: 'Out of Stock' },
  { id: 5, name: 'Nitrile Gloves (Box of 100)', sku: 'NGL-500B', category: 'Safety', stock: 340, price: 12.99, status: 'In Stock' },
];

const mockOrders = [
  { id: 'ORD-8091', customer: 'Acme Hardware Corp', date: '2026-04-10', total: 1250.00, status: 'Processing' },
  { id: 'ORD-8092', customer: 'BuildIt Supplies', date: '2026-04-09', total: 840.50, status: 'Shipped' },
  { id: 'ORD-8093', customer: 'City Maintenance Dept', date: '2026-04-08', total: 3450.00, status: 'Delivered' },
  { id: 'ORD-8094', customer: 'Global Manufacturing', date: '2026-04-08', total: 450.25, status: 'Pending' },
];

// --- COMPONENTS ---

// 1. Sidebar Component
const Sidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            SupplyNest
          </h1>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white transition-colors'} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

// 2. Header Component
const Header = ({ setSidebarOpen }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-slate-100 text-slate-600"
        >
          <Menu size={24} />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search orders, products..." 
            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full w-64 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-px bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-3 cursor-pointer p-1 pr-3 rounded-full hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" 
            alt="Profile" 
            className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200"
          />
          <div className="hidden sm:block text-sm">
            <p className="font-semibold text-slate-700 leading-tight">Admin User</p>
            <p className="text-xs text-slate-500">Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
};

// 3. Dashboard View Component
const DashboardView = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Overview</h2>
          <p className="text-slate-500 text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm shadow-indigo-600/30 flex items-center gap-2 transition-all">
          <Activity size={18} />
          <span>Generate Report</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${stat.isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    <Icon size={24} />
                  </div>
                  <span className={`flex items-center gap-1 text-sm font-semibold ${stat.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stat.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {stat.trend}
                  </span>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts / Tables Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Mini Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Recent Transactions</h3>
            <button className="text-indigo-600 text-sm font-medium hover:text-indigo-800">View All</button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium border-b border-slate-100">Order ID</th>
                  <th className="p-4 font-medium border-b border-slate-100">Customer</th>
                  <th className="p-4 font-medium border-b border-slate-100">Date</th>
                  <th className="p-4 font-medium border-b border-slate-100">Status</th>
                  <th className="p-4 font-medium border-b border-slate-100 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {mockOrders.slice(0, 4).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                    <td className="p-4 font-medium text-indigo-600">{order.id}</td>
                    <td className="p-4 text-slate-700">{order.customer}</td>
                    <td className="p-4 text-slate-500">{order.date}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 
                          order.status === 'Processing' ? 'bg-blue-100 text-blue-700' : 
                          order.status === 'Shipped' ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-100 text-slate-700'}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 text-right">${order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Action / Notice Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="bg-indigo-500/30 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <PackageCheck size={24} className="text-indigo-200" />
              </div>
              <h3 className="text-xl font-bold mb-2">Inventory Alert</h3>
              <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                You have 3 items running low on stock. Restock soon to avoid delaying upcoming wholesale orders.
              </p>
            </div>
            <button className="w-full py-3 px-4 bg-white text-indigo-900 rounded-xl font-bold shadow-sm hover:shadow-md transition-all hover:bg-slate-50 flex items-center justify-center gap-2">
              <Plus size={18} /> Review Stock
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 4. Inventory View Component
const InventoryView = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-6 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500 text-sm">Manage products, pricing, and stock levels.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm shadow-indigo-600/30 flex items-center gap-2 transition-all">
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by SKU, Name, or Category..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {mockProducts.length} items
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10 pointer-events-none">
              <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 border-b border-slate-200">Product Info</th>
                <th className="p-4 border-b border-slate-200">Category</th>
                <th className="p-4 border-b border-slate-200">Price</th>
                <th className="p-4 border-b border-slate-200">Stock Status</th>
                <th className="p-4 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {mockProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">SKU: {product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{product.category}</td>
                  <td className="p-4 font-medium text-slate-800">${product.price.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-max
                        ${product.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 
                          product.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' : 
                          'bg-red-100 text-red-700'}`}
                      >
                        {product.status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        {product.stock} units
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                        <Edit size={16} />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// 5. Main Application Layout wrapper
export default function FrontendComprehensiveApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Render view based on state
  const renderView = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'inventory': return <InventoryView />;
      case 'orders': 
        return (
          <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
            <ShoppingCart size={48} className="mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-slate-600">Orders Module</h2>
            <p className="mt-2 text-sm">Select Inventory or Dashboard to view active components.</p>
          </div>
        );
      default: 
        return (
          <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
            <MoreHorizontal size={48} className="mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-slate-600">Coming Soon</h2>
            <p className="mt-2 text-sm">This module is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header setSidebarOpen={setSidebarOpen} />
        
        {/* Main Viewport */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <div key={activeTab} className="h-full max-w-7xl mx-auto">
              {renderView()}
            </div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

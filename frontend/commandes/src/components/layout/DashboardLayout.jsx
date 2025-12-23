// src/components/layout/DashboardLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  BarChart3, 
  Settings,
  LogOut,
  Mic,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';

function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
    { path: '/commandes', icon: ShoppingBag, label: 'Commandes' },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { path: '/stats', icon: BarChart3, label: 'Statistiques' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-gray-900">VokalBox</span>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg relative">
          <Bell className="w-6 h-6 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:w-64 w-64
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">VokalBox</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>
          </div>

          {/* Restaurant info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.nom_restaurant}
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">
              {user?.email}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Header desktop */}
        <header className="hidden lg:block h-16 bg-white border-b border-gray-200">
          <div className="h-full px-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.nom_restaurant}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 mt-16 lg:mt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;

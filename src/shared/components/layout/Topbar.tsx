import { Menu, Bell, Search, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/authStore';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export const Topbar = ({ onMenuClick, title }: TopbarProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-[4.5rem] bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-20 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
      >
        <Menu className="w-6 h-6" />
      </button>

      {title && (
        <h1 className="text-xl font-semibold text-gray-900 truncate">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Search - desktop only */}
      <div className="relative hidden lg:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Quick search…"
          className="input-base pl-9 w-72 py-2"
        />
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100">
        <Bell className="w-6 h-6" />
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-8 h-8 bg-water-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <span className="text-base font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">{user?.name}</span>
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-base font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 truncate mt-0.5">{user?.email}</p>
              </div>
              <button
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-base text-gray-700 hover:bg-gray-50"
              >
                <User className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-base text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

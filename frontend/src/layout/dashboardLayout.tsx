'use client';

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Scissors } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-50 border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-indigo-600 text-lg">
            <Scissors className="h-5 w-5" />
            SalonApp
          </Link>

          {/* Nav links */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-800">
              <Link to="/appointments" className="hover:text-indigo-600 transition-colors">
                Appointments
              </Link>
              <Link to="/templates" className="hover:text-indigo-600 transition-colors">
                Templates
              </Link>
              <Link to="/notifications" className="hover:text-indigo-600 transition-colors">
                Bulk Notify
              </Link>
              <Link to="/logs" className="hover:text-indigo-600 transition-colors">
                Logs
              </Link>
            </div>
          )}

          {/* Auth */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-800 hover:text-indigo-600">
                  Login
                </Link>
                <Link
                    to="/register"
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

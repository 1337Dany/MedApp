import { useState } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function UserProfile() {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
      <div className="relative">
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.name.charAt(0).toUpperCase()}
          </span>
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-600 capitalize">{user.role}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>

        {isOpen && (
            <>
              <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    Role: {user.role}
                  </p>
                </div>

                <div className="py-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Profile Settings</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Preferences</span>
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-2">
                  <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">Sign Out</span>
                  </button>
                </div>
              </div>
            </>
        )}
      </div>
  );
}
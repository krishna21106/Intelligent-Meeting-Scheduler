import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Activity,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  activeAlertCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  activeAlertCount = 0,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRole = user?.role || user?.roleName;

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'critical';
      case 'OPERATOR':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-card/80 backdrop-blur-md border-b">
      {/* Search / Command Palette Trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-3 px-3.5 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border rounded-xl transition-all w-64 md:w-80 group text-left"
        >
          <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="flex-1 truncate">Search devices, IPs, VLANs...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-background border rounded">
            <span>Ctrl</span>K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Simulator Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Polling: 10s</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenCommandPalette}
          className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title="Alerts notification"
        >
          <Bell className="w-5 h-5" />
          {activeAlertCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-card" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-muted transition text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold text-sm">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <span className="font-semibold text-foreground block">{user?.username}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{userRole?.toLowerCase()}</span>
            </div>
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 p-1.5 rounded-xl bg-card border shadow-xl z-50 text-sm">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium text-foreground">{user?.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-1.5">
                    <Badge variant={getRoleBadgeVariant(userRole)} dot>
                      {userRole}
                    </Badge>
                  </div>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-500/10 transition text-xs font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  CheckCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { useNavigate } from 'react-router-dom';

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query active alerts for notification popup
  const { data: alertsData } = useQuery({
    queryKey: ['headerAlerts'],
    queryFn: () => apiClient.getAlerts({ status: 'ACTIVE', size: 5 }),
    refetchInterval: 15000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) =>
      apiClient.handleAlertAction({ alertIds: [alertId], action: 'ACKNOWLEDGE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['headerAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

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

  const activeAlerts = alertsData?.content || [];
  const alertCount = activeAlertCount || activeAlerts.length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-card/85 backdrop-blur-md border-b border-border/80 transition-colors">
      {/* Search / Command Palette Trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-3 px-3.5 py-2 text-sm text-muted-foreground bg-muted/40 hover:bg-muted/80 hover:border-indigo-500/40 border border-border/80 rounded-xl transition-all w-64 md:w-80 group text-left shadow-sm"
        >
          <Search className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
          <span className="flex-1 truncate text-xs font-medium">Search devices, IPs, VLANs...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-background/80 border rounded-md shadow-xs">
            <span>Ctrl</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Network Heartbeat Indicator */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-tight">Telemetry Live • 40 Nodes</span>
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUserMenuOpen(false);
            }}
            className={`relative p-2 rounded-xl border transition-all ${
              notificationsOpen
                ? 'bg-muted text-foreground border-indigo-500/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border-transparent'
            }`}
            title="Active notifications"
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 p-2 rounded-2xl bg-card border border-border shadow-2xl z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-xs uppercase tracking-wider">Active Alerts</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500">
                      {alertCount}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/alerts');
                    }}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-border/50 py-1">
                  {activeAlerts.length > 0 ? (
                    activeAlerts.slice(0, 4).map((alert: any) => (
                      <div key={alert.id} className="p-3 hover:bg-muted/40 rounded-xl transition flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={alert.severity === 'CRITICAL' ? 'critical' : alert.severity === 'WARNING' ? 'warning' : 'info'}
                            dot
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-tabular">
                            {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground leading-tight">{alert.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{alert.message}</p>
                        <div className="flex items-center justify-end pt-1">
                          <button
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                          >
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      All systems nominal. No active alerts.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all border border-transparent hover:border-border"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600 transition-transform -rotate-12 hover:rotate-0" />
          )}
        </button>

        <div className="h-6 w-px bg-border/80 mx-1" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border transition-all text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-indigo-500/20">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <span className="font-semibold text-foreground block">{user?.username}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{userRole?.toLowerCase()}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 p-1.5 rounded-2xl bg-card border border-border shadow-2xl z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2.5 border-b border-border/80">
                  <p className="font-semibold text-foreground text-xs">{user?.username}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-2">
                    <Badge variant={getRoleBadgeVariant(userRole)} dot>
                      {userRole}
                    </Badge>
                  </div>
                </div>
                <div className="pt-1.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500/10 transition text-xs font-semibold"
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

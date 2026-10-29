import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Network,
  AlertTriangle,
  FolderTree,
  FileBarChart,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAlertCount?: number;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeAlertCount = 0,
}) => {
  const { role } = useAuth();
  const staffNavItems: NavItem[] = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Device Inventory', to: '/devices', icon: Server },
    { name: 'Topology Map', to: '/topology', icon: Network },
    {
      name: 'Alerts',
      to: '/alerts',
      icon: AlertTriangle,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
    },
    { name: 'IPAM & VLANs', to: '/ipam', icon: FolderTree },
    { name: 'Reports & SLA', to: '/reports', icon: FileBarChart },
    { name: 'Audit Log', to: '/audit', icon: History },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];
  const customerNavItems: NavItem[] = [
    { name: 'My Network', to: '/', icon: LayoutDashboard },
    { name: 'My Alerts', to: '/my-alerts', icon: AlertTriangle },
  ];
  const navItems = role === 'CUSTOMER' ? customerNavItems : staffNavItems;

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r bg-card flex flex-col justify-between ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / Logo */}
      <div>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-indigo-500/30">
                C
              </div>
              <div className="leading-tight">
                <span className="font-bold text-sm tracking-tight text-foreground block">CNIP NMS</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block">Network Manager</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 mx-auto rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              C
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition ${
              collapsed ? 'hidden' : 'block'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="truncate">{item.name}</span>
                  {item.badge !== undefined && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Simulator Indicator & Collapse Button */}
      <div className="p-3 border-t space-y-2">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-foreground">Telemetry Live</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">40 devices • 3 sites active</p>
          </div>
        )}
      </div>
    </aside>
  );
};

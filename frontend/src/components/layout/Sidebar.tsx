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
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

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
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeAlertCount = 0,
}) => {
  const { role } = useAuth();
  const { template } = useTheme();

  // Role-specific navigation arrays
  const adminNav: NavItem[] = [
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
    { name: 'Settings & Probes', to: '/settings', icon: Settings },
  ];

  const operatorNav: NavItem[] = [
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
    { name: 'Reports', to: '/reports', icon: FileBarChart },
    { name: 'Settings & Probes', to: '/settings', icon: Settings },
  ];

  const customerNav: NavItem[] = [
    { name: 'My Network Station', to: '/', icon: Network },
    {
      name: 'My Alerts',
      to: '/my-alerts',
      icon: AlertTriangle,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
    },
  ];

  const viewerNav: NavItem[] = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Device Inventory', to: '/devices', icon: Server },
    { name: 'Topology Map', to: '/topology', icon: Network },
    { name: 'Alerts', to: '/alerts', icon: AlertTriangle },
    { name: 'IPAM & VLANs', to: '/ipam', icon: FolderTree },
    { name: 'Reports', to: '/reports', icon: FileBarChart },
  ];

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'ADMIN':
        return adminNav;
      case 'OPERATOR':
        return operatorNav;
      case 'CUSTOMER':
        return customerNav;
      default:
        return viewerNav;
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-border/80 bg-card/95 backdrop-blur-md flex flex-col justify-between select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header / Logo */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between h-16 px-4 border-b border-border/80 flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/25 flex-shrink-0">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight overflow-hidden">
                <span className="font-extrabold text-sm tracking-tight text-foreground block truncate">
                  CNIP Lab NOC
                </span>
                <span className="text-[10px] text-indigo-500 font-semibold tracking-wider uppercase block truncate">
                  College Lab Manager
                </span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/25">
              <Radio className="w-5 h-5 text-white" />
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition ${
              collapsed ? 'hidden' : 'block'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="truncate">{item.name}</span>
                  <div className="flex items-center gap-1.5 ml-2">
                    {item.highlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Lab Engine & Template Status */}
      <div className="p-3 border-t border-border/80 flex-shrink-0">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  Lab Network
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Template:</span>
              <span className="font-semibold text-foreground capitalize">
                {template === 'cyber-dark' ? 'Cyber Dark NOC' : 'Clean Light'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

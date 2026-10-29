import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Server,
  LayoutDashboard,
  Network,
  AlertTriangle,
  FolderTree,
  FileBarChart,
  History,
  Settings,
  PlusCircle,
  RefreshCw,
  Sun,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Device, PageResponse } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddDevice?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenAddDevice,
}) => {
  const [query, setQuery] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Pre-fetch devices for instant search
      apiClient.getDevices({ size: 50 }).then((res: PageResponse<Device>) => setDevices(res.content)).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.ipAddress.toLowerCase().includes(query.toLowerCase()) ||
      d.site.toLowerCase().includes(query.toLowerCase()) ||
      d.vendor.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  const actions = [
    { label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/') },
    { label: 'Go to Device Inventory', icon: Server, action: () => navigate('/devices') },
    { label: 'Go to Topology Map', icon: Network, action: () => navigate('/topology') },
    { label: 'Go to Active Alerts', icon: AlertTriangle, action: () => navigate('/alerts') },
    { label: 'Go to IPAM & Subnets', icon: FolderTree, action: () => navigate('/ipam') },
    { label: 'Go to SLA Reports', icon: FileBarChart, action: () => navigate('/reports') },
    { label: 'Go to Audit Logs', icon: History, action: () => navigate('/audit') },
    { label: 'Go to Settings', icon: Settings, action: () => navigate('/settings') },
    {
      label: 'Add New Network Device',
      icon: PlusCircle,
      action: () => {
        if (onOpenAddDevice) onOpenAddDevice();
        else navigate('/devices');
      },
    },
    {
      label: 'Trigger Telemetry Poll Cycle',
      icon: RefreshCw,
      action: async () => {
        try {
          await apiClient.triggerSimulatorPoll();
        } catch {}
      },
    },
    { label: 'Toggle Light / Dark Theme', icon: Sun, action: toggleTheme },
  ];

  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card border shadow-2xl rounded-2xl overflow-hidden z-10 flex flex-col max-h-[70vh]">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search devices by name, IP, vendor..."
            className="w-full bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            autoFocus
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-border/40">
          {filteredDevices.length > 0 && (
            <div className="pb-2">
              <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Devices ({filteredDevices.length})
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredDevices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onClose();
                      navigate(`/devices/${d.id}`);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-muted/80 text-foreground transition text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Server className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                      <div>
                        <span className="font-medium text-foreground">{d.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-tabular">
                          {d.ipAddress} • {d.site}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredActions.length > 0 && (
            <div className="pt-2">
              <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Actions & Navigation
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredActions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onClose();
                      a.action();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-muted/80 text-foreground transition text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                      <span className="font-medium">{a.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredDevices.length === 0 && filteredActions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No matching devices or commands found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

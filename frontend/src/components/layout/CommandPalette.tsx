import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Radio,
  Cpu,
  Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Device, PageResponse } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

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
  const { toggleTemplate, template } = useTheme();
  const { role } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Pre-fetch devices for instant search
      apiClient
        .getDevices({ size: 50 })
        .then((res: PageResponse<Device>) => setDevices(res.content))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDevices = devices
    .filter(
      (d) =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.ipAddress.toLowerCase().includes(query.toLowerCase()) ||
        d.site.toLowerCase().includes(query.toLowerCase()) ||
        d.vendor.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 6);

  const allActions = [
    { label: 'Go to Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATOR', 'VIEWER'], action: () => navigate('/') },
    { label: 'Go to Operator Signup Requests', icon: ShieldCheck, roles: ['ADMIN'], action: () => navigate('/operator-requests') },
    { label: 'Go to OSI Model Compliance', icon: Layers, roles: ['ADMIN', 'VIEWER'], action: () => navigate('/osi-compliance') },
    { label: 'Go to Packet Analyzer (Wireshark-Grade)', icon: Radio, roles: ['ADMIN', 'OPERATOR', 'CUSTOMER'], action: () => navigate('/packet-analyzer') },
    { label: 'Go to My Lab Router Settings', icon: Cpu, roles: ['OPERATOR'], action: () => navigate('/operator/router') },
    { label: 'Go to Lab Workstations', icon: Users, roles: ['OPERATOR'], action: () => navigate('/operator/customers') },
    { label: 'Go to Device Inventory', icon: Server, roles: ['ADMIN', 'OPERATOR', 'VIEWER'], action: () => navigate('/devices') },
    { label: 'Go to Topology Map', icon: Network, roles: ['ADMIN', 'OPERATOR', 'VIEWER', 'CUSTOMER'], action: () => navigate('/topology') },
    { label: 'Go to Active Alerts', icon: AlertTriangle, roles: ['ADMIN', 'OPERATOR', 'VIEWER'], action: () => navigate('/alerts') },
    { label: 'Go to My Alerts', icon: AlertTriangle, roles: ['CUSTOMER'], action: () => navigate('/my-alerts') },
    { label: 'Go to IPAM & Subnets', icon: FolderTree, roles: ['ADMIN', 'OPERATOR'], action: () => navigate('/ipam') },
    { label: 'Go to SLA Reports', icon: FileBarChart, roles: ['ADMIN', 'OPERATOR', 'VIEWER'], action: () => navigate('/reports') },
    { label: 'Go to Audit Logs', icon: History, roles: ['ADMIN'], action: () => navigate('/audit') },
    { label: 'Go to Settings', icon: Settings, roles: ['ADMIN', 'OPERATOR', 'VIEWER', 'CUSTOMER'], action: () => navigate('/settings') },
    {
      label: `Switch Visual Template (Now: ${template === 'cyber-dark' ? 'Cyber Dark NOC' : 'Clean Light Campus'})`,
      icon: Sparkles,
      roles: ['ADMIN', 'OPERATOR', 'VIEWER', 'CUSTOMER'],
      action: toggleTemplate,
    },
    {
      label: 'Add New Network Device',
      icon: PlusCircle,
      roles: ['ADMIN', 'OPERATOR'],
      action: () => {
        if (onOpenAddDevice) onOpenAddDevice();
        else navigate('/devices');
      },
    },
    {
      label: 'Trigger Telemetry Poll Cycle',
      icon: RefreshCw,
      roles: ['ADMIN', 'OPERATOR'],
      action: async () => {
        try {
          await apiClient.triggerSimulatorPoll();
        } catch {}
      },
    },
  ];

  const filteredActions = allActions.filter(
    (a) =>
      (!role || a.roles.includes(role)) &&
      a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden z-10 flex flex-col max-h-[70vh]"
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/70 bg-muted/20">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search devices, packets, IPs, or type a command..."
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

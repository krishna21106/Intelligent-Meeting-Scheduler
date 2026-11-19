import React from 'react';
import { motion } from 'framer-motion';
import { Layers, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayerItem {
  layer: number;
  name: string;
  shortName: string;
  protocols: string;
  status: 'ACTIVE' | 'WARNING' | 'INACTIVE';
  packetShare: number; // percentage
}

const OSI_LAYERS_DATA: LayerItem[] = [
  { layer: 1, name: 'Physical', shortName: 'L1 PHY', protocols: '10G-BaseT, Fiber', status: 'ACTIVE', packetShare: 100 },
  { layer: 2, name: 'Data Link', shortName: 'L2 MAC', protocols: 'Ethernet II, ARP, 802.1Q', status: 'ACTIVE', packetShare: 98 },
  { layer: 3, name: 'Network', shortName: 'L3 IP', protocols: 'IPv4, ICMP, OSPF, Subnets', status: 'ACTIVE', packetShare: 96 },
  { layer: 4, name: 'Transport', shortName: 'L4 TCP/UDP', protocols: 'TCP SYN/ACK, UDP', status: 'ACTIVE', packetShare: 94 },
  { layer: 5, name: 'Session', shortName: 'L5 SESS', protocols: 'NetBIOS, RPC, Sockets', status: 'ACTIVE', packetShare: 82 },
  { layer: 6, name: 'Presentation', shortName: 'L6 TLS', protocols: 'TLS 1.3, SSHv2, JSON', status: 'ACTIVE', packetShare: 88 },
  { layer: 7, name: 'Application', shortName: 'L7 APP', protocols: 'HTTP/2, DNS, DHCP, SNMP', status: 'ACTIVE', packetShare: 92 },
];

export const OsiHeatStrip: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span>OSI 7-Layer Protocol Compliance Strip</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                100% Compliant
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Real-time educational telemetry across all 7 layers of the network stack
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/osi-compliance')}
          className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition"
        >
          <span>Compliance Center</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 7-Segment Heat Strip Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {OSI_LAYERS_DATA.map((item, idx) => (
          <motion.div
            key={item.layer}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.15 }}
            onClick={() => navigate('/osi-compliance')}
            className="cursor-pointer group relative rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/50 p-2.5 transition-all hover:border-indigo-500/40 hover:-translate-y-0.5"
          >
            {/* Top Indicator */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-indigo-500">
                {item.shortName}
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            {/* Layer Title */}
            <p className="text-xs font-semibold text-foreground mt-1 truncate group-hover:text-indigo-500 transition-colors">
              {item.name}
            </p>

            {/* Protocol Tags */}
            <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={item.protocols}>
              {item.protocols}
            </p>

            {/* Micro Health Bar */}
            <div className="w-full bg-muted/60 h-1 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${item.packetShare}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

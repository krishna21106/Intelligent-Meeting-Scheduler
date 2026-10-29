import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { apiClient } from '../api/client';
import {
  Server,
  Network,
  Shield,
  Wifi,
  Radio,
  Activity,
  Cpu,
  HardDrive,
  X,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { useNavigate } from 'react-router-dom';

// Custom Node Component for React Flow
const DeviceNode = ({ data }: { data: any }) => {
  const isDown = data.status === 'DOWN';
  const isWarning = data.status === 'WARNING';

  const getNodeIcon = () => {
    switch (data.deviceType?.toUpperCase()) {
      case 'ROUTER':
        return <Network className="w-4 h-4 text-white" />;
      case 'SWITCH':
        return <Server className="w-4 h-4 text-white" />;
      case 'FIREWALL':
        return <Shield className="w-4 h-4 text-white" />;
      case 'ACCESS_POINT':
        return <Wifi className="w-4 h-4 text-white" />;
      default:
        return <Radio className="w-4 h-4 text-white" />;
    }
  };

  const getBorderColor = () => {
    if (isDown) return 'border-rose-500 shadow-rose-500/25 ring-2 ring-rose-500/20';
    if (isWarning) return 'border-amber-500 shadow-amber-500/25 ring-2 ring-amber-500/20';
    return 'border-indigo-500/40 shadow-indigo-500/10 hover:border-indigo-500';
  };

  const getBadgeColor = () => {
    if (isDown) return 'bg-rose-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      className={`px-3.5 py-2.5 rounded-2xl bg-card/95 backdrop-blur-md border-2 shadow-lg transition-all duration-200 hover:scale-105 min-w-[160px] ${getBorderColor()}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-white" />
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-xl ${getBadgeColor()} shadow-md shadow-emerald-500/20`}>{getNodeIcon()}</div>
        <div className="overflow-hidden">
          <div className="font-extrabold text-xs text-foreground truncate">{data.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">{data.ip}</div>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/80 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground truncate max-w-[85px]">{data.site?.split(' - ')[1] || data.site}</span>
        <span className="font-bold font-tabular text-foreground">{data.cpu || 25}% CPU</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-white" />
    </div>
  );
};

const nodeTypes = {
  router: DeviceNode,
  switch: DeviceNode,
  firewall: DeviceNode,
  access_point: DeviceNode,
  server: DeviceNode,
  default: DeviceNode,
};

export const TopologyPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['topology', selectedSite],
    queryFn: () => apiClient.getTopologyGraph(selectedSite === 'ALL' ? undefined : selectedSite),
  });

  const nodes: Node[] = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((n) => {
      const isMatch = searchQuery
        ? n.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.data?.ip?.includes(searchQuery)
        : true;
      return {
        id: n.id,
        type: n.type || 'default',
        position: n.position,
        data: n.data,
        style: searchQuery && !isMatch ? { opacity: 0.25 } : { opacity: 1 },
      };
    });
  }, [graphData, searchQuery]);

  const edges: Edge[] = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.animated,
      style: e.style,
      data: e.data,
    }));
  }, [graphData]);

  const sites = [
    { id: 'ALL', label: 'All Sites (Global)' },
    { id: 'HQ - New York', label: 'HQ - New York' },
    { id: 'DC - Ashburn', label: 'DC - Ashburn' },
    { id: 'Branch - Frankfurt', label: 'Branch - Frankfurt' },
  ];

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      {/* Topology Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Interactive Topology Map</h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Live Mesh
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time link utilization, mesh adjacency, and status visualization
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Site Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border/80 text-xs">
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => setSelectedSite(site.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedSite === site.id
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {site.label}
              </button>
            ))}
          </div>

          {/* Quick Search on Canvas */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Locate node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-border/80 bg-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44 shadow-xs"
            />
          </div>

          {/* Legend Badges */}
          <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-card border border-border/80 text-[11px] font-semibold text-muted-foreground shadow-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> UP
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Degraded
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Down
            </span>
          </div>
        </div>
      </div>

      {/* React Flow Canvas Container */}
      <div className="relative flex-1 rounded-2xl border border-border/80 bg-slate-950/20 backdrop-blur-sm overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Rendering interactive topology graph...</span>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node.data)}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls className="!bg-card !border !border-border !shadow-md !rounded-xl overflow-hidden" />
            <Background color="#6366f1" gap={24} size={1} />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.status === 'DOWN') return '#ef4444';
                if (n.data?.status === 'WARNING') return '#f59e0b';
                return '#10b981';
              }}
              className="!bg-card !border !border-border !rounded-2xl !overflow-hidden !shadow-md"
            />
          </ReactFlow>
        )}

        {/* Node Details Slide-Out Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 sm:w-96 bg-card/95 backdrop-blur-md border border-border rounded-2xl p-5 shadow-2xl z-20 space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-border/80">
              <div>
                <h3 className="font-extrabold text-base text-foreground tracking-tight">{selectedNode.label}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedNode.ip}</p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Operating Status</span>
                <Badge variant={selectedNode.status === 'UP' ? 'up' : selectedNode.status === 'DOWN' ? 'down' : 'warning'} dot>
                  {selectedNode.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Device Taxonomy</span>
                <span className="font-bold text-foreground">{selectedNode.deviceType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Site & Location</span>
                <span className="font-semibold text-foreground">{selectedNode.site} ({selectedNode.location})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hardware Architecture</span>
                <span className="font-semibold text-foreground">{selectedNode.vendor} {selectedNode.model}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500" /> CPU Load
                </span>
                <span className="font-bold font-tabular text-foreground">{selectedNode.cpu}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${selectedNode.cpu > 80 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                  style={{ width: `${selectedNode.cpu}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-500" /> Memory
                </span>
                <span className="font-bold font-tabular text-foreground">{selectedNode.memory}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${selectedNode.memory > 85 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                  style={{ width: `${selectedNode.memory}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" /> Latency
                </span>
                <span className="font-bold font-tabular text-foreground">{selectedNode.latency}ms</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/devices/${selectedNode.id}`)}
              className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
            >
              <span>Inspect Full Device Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

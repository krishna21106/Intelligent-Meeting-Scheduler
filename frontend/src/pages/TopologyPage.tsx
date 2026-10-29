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
    if (isDown) return 'border-rose-500 shadow-rose-500/20';
    if (isWarning) return 'border-amber-500 shadow-amber-500/20';
    return 'border-indigo-500/40 shadow-indigo-500/10';
  };

  const getBadgeColor = () => {
    if (isDown) return 'bg-rose-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl bg-card border-2 shadow-lg transition-all hover:scale-105 min-w-[150px] ${getBorderColor()}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2 !h-2" />
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${getBadgeColor()} shadow-sm`}>{getNodeIcon()}</div>
        <div className="overflow-hidden">
          <div className="font-bold text-xs text-foreground truncate">{data.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">{data.ip}</div>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-border flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground truncate">{data.site?.split(' - ')[1] || data.site}</span>
        <span className="font-semibold font-tabular text-foreground">{data.cpu || 25}% CPU</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-2 !h-2" />
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

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['topology', selectedSite],
    queryFn: () => apiClient.getTopologyGraph(selectedSite === 'ALL' ? undefined : selectedSite),
  });

  const nodes: Node[] = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((n) => ({
      id: n.id,
      type: n.type || 'default',
      position: n.position,
      data: n.data,
    }));
  }, [graphData]);

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

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      {/* Topology Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Interactive Topology Map</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time link utilization, mesh adjacency, and status visualization
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Cluster Filter:</span>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="px-3 py-1.5 rounded-lg border bg-card text-foreground font-medium text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Sites (Global Mesh)</option>
              <option value="HQ - New York">HQ - New York</option>
              <option value="DC - Ashburn">DC - Ashburn</option>
              <option value="Branch - Frankfurt">Branch - Frankfurt</option>
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-card border text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> UP
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Degraded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Down
            </span>
          </div>
        </div>
      </div>

      {/* React Flow Canvas Container */}
      <div className="relative flex-1 rounded-2xl border bg-slate-950/20 backdrop-blur-sm overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Loading topology graph...
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
            <Controls className="!bg-card !border !shadow-sm !rounded-xl overflow-hidden" />
            <Background color="#6366f1" gap={24} size={1} />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.status === 'DOWN') return '#ef4444';
                if (n.data?.status === 'WARNING') return '#f59e0b';
                return '#10b981';
              }}
              className="!bg-card !border !rounded-xl !overflow-hidden"
            />
          </ReactFlow>
        )}

        {/* Node Details Slide-Out Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 bg-card/95 backdrop-blur-md border rounded-2xl p-5 shadow-2xl z-20 space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-start justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-base text-foreground tracking-tight">{selectedNode.label}</h3>
                <p className="text-xs text-muted-foreground font-mono">{selectedNode.ip}</p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Operating Status</span>
                <Badge variant={selectedNode.status === 'UP' ? 'up' : selectedNode.status === 'DOWN' ? 'down' : 'warning'} dot>
                  {selectedNode.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Device Type</span>
                <span className="font-semibold text-foreground">{selectedNode.deviceType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Site & Rack</span>
                <span className="font-semibold text-foreground">{selectedNode.site} ({selectedNode.location})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Model Architecture</span>
                <span className="font-semibold text-foreground">{selectedNode.vendor} {selectedNode.model}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> CPU Load
                </span>
                <span className="font-semibold font-tabular text-foreground">{selectedNode.cpu}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" /> Memory
                </span>
                <span className="font-semibold font-tabular text-foreground">{selectedNode.memory}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Latency
                </span>
                <span className="font-semibold font-tabular text-foreground">{selectedNode.latency}ms</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/devices/${selectedNode.id}`)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2 transition"
            >
              <span>Inspect Device Detail</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

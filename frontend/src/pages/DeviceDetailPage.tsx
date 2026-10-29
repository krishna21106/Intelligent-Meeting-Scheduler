import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import {
  ArrowLeft,
  Activity,
  Cpu,
  HardDrive,
  Radio,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  GitCompare,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const deviceId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'interfaces' | 'metrics' | 'config' | 'alerts'>('overview');
  const [selectedVersionA, setSelectedVersionA] = useState<number>(1);
  const [selectedVersionB, setSelectedVersionB] = useState<number>(2);

  // Queries
  const { data: device, isLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => apiClient.getDeviceById(deviceId),
    enabled: !isNaN(deviceId),
  });

  const { data: metrics } = useQuery({
    queryKey: ['deviceMetrics', deviceId],
    queryFn: () => apiClient.getDeviceMetrics(deviceId, 24),
    enabled: !isNaN(deviceId),
    refetchInterval: 10000,
  });

  const { data: interfaces } = useQuery({
    queryKey: ['deviceInterfaces', deviceId],
    queryFn: () => apiClient.getDeviceInterfaces(deviceId),
    enabled: !isNaN(deviceId) && activeTab === 'interfaces',
  });

  const { data: configs } = useQuery({
    queryKey: ['deviceConfigs', deviceId],
    queryFn: () => apiClient.getDeviceBackups(deviceId),
    enabled: !isNaN(deviceId) && activeTab === 'config',
  });

  const { data: diffData } = useQuery({
    queryKey: ['configDiff', deviceId, selectedVersionA, selectedVersionB],
    queryFn: () => apiClient.compareConfigVersions(deviceId, selectedVersionA, selectedVersionB),
    enabled: !isNaN(deviceId) && activeTab === 'config' && selectedVersionA !== selectedVersionB,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['deviceAlerts', deviceId],
    queryFn: () => apiClient.getAlerts({ deviceId }),
    enabled: !isNaN(deviceId) && activeTab === 'alerts',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customer-accounts'],
    queryFn: () => apiClient.auth.customers(),
    enabled: isAdmin,
  });

  const assignCustomerMutation = useMutation({
    mutationFn: (customerId?: number) => apiClient.assignDeviceCustomer(deviceId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      queryClient.invalidateQueries({ queryKey: ['customer-devices'] });
    },
  });

  // Backup mutation
  const backupMutation = useMutation({
    mutationFn: () => apiClient.triggerConfigBackup(deviceId, 'RUNNING'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviceConfigs', deviceId] });
    },
  });

  if (isLoading || !device) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  const latestMetric = metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'UP':
        return 'up';
      case 'DOWN':
        return 'down';
      case 'WARNING':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/devices')}
            className="p-2 rounded-xl border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{device.name}</h1>
              <Badge variant={getStatusBadgeVariant(device.status)} dot>
                {device.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {device.ipAddress} • {device.site} ({device.location})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${backupMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Snapshot Config</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'interfaces', label: `Interfaces (${device.interfaces?.length || 0})` },
          { key: 'metrics', label: 'Telemetry & Metrics' },
          { key: 'config', label: 'Config Backups & Diff' },
          { key: 'alerts', label: 'Alerts & Incidents' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 relative transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="CPU Load"
              value={latestMetric ? `${latestMetric.cpuUsage}%` : '28.4%'}
              subValue="Real-time telemetry"
              icon={Cpu}
              variant={latestMetric && latestMetric.cpuUsage > 85 ? 'danger' : 'default'}
            />
            <StatCard
              title="Memory Utilization"
              value={latestMetric ? `${latestMetric.memoryUsage}%` : '42.1%'}
              subValue="DRAM buffers"
              icon={HardDrive}
              variant="default"
            />
            <StatCard
              title="Ping Latency"
              value={latestMetric ? `${latestMetric.latencyMs}ms` : '1.8ms'}
              subValue="ICMP roundtrip"
              icon={Activity}
              variant={latestMetric && latestMetric.latencyMs > 50 ? 'warning' : 'success'}
            />
            <StatCard
              title="Packet Loss"
              value={latestMetric ? `${latestMetric.packetLossPct}%` : '0.0%'}
              subValue="Health probe loss"
              icon={Radio}
              variant={latestMetric && latestMetric.packetLossPct > 1 ? 'danger' : 'success'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Hardware & System Information</h2>
              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Device Vendor</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{device.vendor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Model Architecture</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{device.model}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Device Class</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{device.deviceType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Physical Location</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{device.site} ({device.location})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">SNMP Version</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{device.snmpVersion?.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">SNMP Port</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{device.snmpPort}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Assigned Tags & Attributes</h2>
              <div className="flex flex-wrap gap-2">
                {device.tags ? (
                  device.tags.split(',').map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                      #{tag.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No tags configured</span>
                )}
              </div>
              <div className="pt-4 border-t text-xs text-muted-foreground">
                <span className="block font-medium text-foreground mb-1">Telemetry Status</span>
                <span>Continuously monitored via SNMP4J simulator engine with 10s resolution.</span>
              </div>
            </div>
            {isAdmin && (
              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Customer access</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Customers only see devices explicitly assigned to their account.</p>
                  </div>
                  <select
                    aria-label="Assign device to customer"
                    value={device.customerId ?? ''}
                    disabled={assignCustomerMutation.isPending}
                    onChange={event => assignCustomerMutation.mutate(event.target.value ? Number(event.target.value) : undefined)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:max-w-sm"
                  >
                    <option value="">Unassigned</option>
                    {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.username} · {customer.email}</option>)}
                  </select>
                </div>
                {assignCustomerMutation.isError && <p role="alert" className="mt-2 text-xs text-rose-600">{assignCustomerMutation.error.message}</p>}
              </section>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERFACES */}
      {activeTab === 'interfaces' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold text-foreground">Device Network Interfaces</h2>
            <p className="text-xs text-muted-foreground">Port status, operational speed, and octet throughput</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/60 text-muted-foreground border-b select-none">
                <tr>
                  <th className="px-4 py-3 font-semibold">Interface</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Speed</th>
                  <th className="px-4 py-3 font-semibold">IP Address</th>
                  <th className="px-4 py-3 font-semibold">MAC Address</th>
                  <th className="px-4 py-3 font-semibold">Throughput (In/Out)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {interfaces && interfaces.length > 0 ? (
                  interfaces.map((iface) => (
                    <tr key={iface.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-medium text-foreground">{iface.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(iface.status)} dot>
                          {iface.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-tabular">
                        {iface.speedBps ? `${iface.speedBps / 1_000_000_000} Gbps` : '1 Gbps'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{iface.ipAddress || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{iface.macAddress || '—'}</td>
                      <td className="px-4 py-3 text-xs font-tabular text-muted-foreground">
                        {(iface.inOctets / (1024 * 1024)).toFixed(1)} MB / {(iface.outOctets / (1024 * 1024)).toFixed(1)} MB
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No interfaces found for this device.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: METRICS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU & Memory Chart */}
            <div className="bg-card rounded-xl border p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-1">CPU & Memory Utilization (%)</h2>
              <p className="text-xs text-muted-foreground mb-4">Historical 24-hour telemetry curve</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="recordedAt"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Line type="monotone" dataKey="cpuUsage" name="CPU %" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="memoryUsage" name="Memory %" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Latency Chart */}
            <div className="bg-card rounded-xl border p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-1">Ping Latency (ms)</h2>
              <p className="text-xs text-muted-foreground mb-4">ICMP response time jitter</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="recordedAt"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [`${val} ms`]}
                    />
                    <Area type="monotone" dataKey="latencyMs" name="Latency" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIG BACKUPS & DIFF */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Configuration Version Comparison</h2>
                <p className="text-xs text-muted-foreground">Select two snapshots to inspect line-by-line configuration diff</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Version A:</span>
                  <select
                    value={selectedVersionA}
                    onChange={(e) => setSelectedVersionA(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border bg-background font-semibold"
                  >
                    {configs?.map((c) => (
                      <option key={c.version} value={c.version}>v{c.version} ({new Date(c.backedUpAt).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>

                <GitCompare className="w-4 h-4 text-muted-foreground" />

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Version B:</span>
                  <select
                    value={selectedVersionB}
                    onChange={(e) => setSelectedVersionB(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border bg-background font-semibold"
                  >
                    {configs?.map((c) => (
                      <option key={c.version} value={c.version}>v{c.version} ({new Date(c.backedUpAt).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Diff View Box */}
            <div className="rounded-xl border bg-slate-950 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-slate-400">
                <span>Unified Diff output (v{selectedVersionA} → v{selectedVersionB})</span>
                <span className="text-emerald-400">
                  {diffData ? `${diffData.diffLines?.filter((l) => l.changeType === 'ADDED').length || 0} additions` : ''}
                </span>
              </div>
              <div className="p-4 max-h-[420px] overflow-y-auto space-y-0.5">
                {diffData && diffData.diffLines?.length ? (
                  diffData.diffLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start px-2 py-0.5 rounded ${
                        line.changeType === 'ADDED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : line.changeType === 'REMOVED'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="w-8 select-none text-slate-600 flex-shrink-0">{line.lineNumber}</span>
                      <span className="w-4 select-none font-bold">
                        {line.changeType === 'ADDED' ? '+' : line.changeType === 'REMOVED' ? '-' : ' '}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{line.content}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    Configurations are identical between these two versions.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALERTS */}
      {activeTab === 'alerts' && (
        <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Device Incident Log</h2>
          <div className="space-y-3">
            {alertsData?.content?.length ? (
              alertsData.content.map((alert) => (
                <div key={alert.id} className="p-4 rounded-xl border bg-muted/20 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{alert.title}</span>
                        <Badge variant="warning">{alert.severity}</Badge>
                        <Badge variant="info">{alert.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-tabular">
                    {new Date(alert.triggeredAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                No active or historical alerts recorded for this device.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

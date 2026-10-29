import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bell, Cpu, Gauge, Server, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const devicesQuery = useQuery({
    queryKey: ['customer-devices'],
    queryFn: () => apiClient.getCustomerDevices(),
    refetchInterval: 10000,
  });
  const alertsQuery = useQuery({
    queryKey: ['customer-alerts'],
    queryFn: () => apiClient.getCustomerAlerts(),
    refetchInterval: 10000,
  });
  const devices = devicesQuery.data?.content ?? [];
  const alerts = alertsQuery.data?.content ?? [];
  const activeAlerts = alerts.filter(alert => alert.status === 'ACTIVE').length;
  const onlineDevices = devices.filter(device => device.status === 'UP').length;
  const averageLatency = devices.filter(device => device.latestLatencyMs != null);
  const averageLatencyMs = averageLatency.length
    ? averageLatency.reduce((total, device) => total + (device.latestLatencyMs ?? 0), 0) / averageLatency.length
    : null;
  const telemetryByDevice = [...devices]
    .filter(device => device.latestCpuUsage != null || device.latestMemoryUsage != null)
    .sort((a, b) => (b.latestCpuUsage ?? -1) - (a.latestCpuUsage ?? -1))
    .slice(0, 8)
    .map(device => ({
      name: device.name,
      cpu: device.latestCpuUsage ?? null,
      memory: device.latestMemoryUsage ?? null,
    }));
  const statusCounts = devices.reduce<Record<string, number>>((counts, device) => {
    counts[device.status] = (counts[device.status] ?? 0) + 1;
    return counts;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const statusColors: Record<string, string> = {
    UP: '#10b981',
    WARNING: '#f59e0b',
    DOWN: '#ef4444',
    MAINTENANCE: '#64748b',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-4 w-4" /> Customer portal
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">My network</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome, {user?.username}. This view only shows devices assigned to your account.</p>
        </div>
        <Link to="/my-alerts" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          View all alerts <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {devicesQuery.isError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">Could not load assigned devices: {devicesQuery.error.message}</p>}
      {alertsQuery.isError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">Could not load alerts: {alertsQuery.error.message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Server className="h-5 w-5" />} label="Assigned devices" value={devicesQuery.data?.totalElements ?? '—'} />
        <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Online" value={onlineDevices} />
        <SummaryCard icon={<Bell className="h-5 w-5" />} label="Active alerts" value={alertsQuery.isError ? '—' : activeAlerts} />
        <SummaryCard icon={<Gauge className="h-5 w-5" />} label="Average latency" value={averageLatencyMs == null ? '—' : `${averageLatencyMs.toFixed(1)} ms`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-foreground">Latest device utilization</h2>
              <p className="mt-1 text-xs text-muted-foreground">CPU and memory for your assigned devices · refreshed every 10 seconds</p>
            </div>
            <Cpu className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          {devicesQuery.isLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          ) : telemetryByDevice.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
              {devices.length ? 'Telemetry is not available for your assigned devices yet.' : 'Assign devices to your account to see their telemetry.'}
            </div>
          ) : (
            <>
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={telemetryByDevice} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={48} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={value => typeof value === 'number' ? `${value.toFixed(1)}%` : value == null ? 'No data' : String(value)} />
                    <Legend />
                    <Bar dataKey="cpu" name="CPU" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="memory" name="Memory" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Showing up to 8 devices with the highest reported CPU utilization.</p>
            </>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-foreground">Device status</h2>
          <p className="mt-1 text-xs text-muted-foreground">Current status of assigned devices</p>
          {devicesQuery.isLoading ? (
            <div className="mt-4 h-56 animate-pulse rounded-lg bg-muted" />
          ) : statusData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">No assigned devices to summarize.</div>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>
                      {statusData.map(item => <Cell key={item.name} fill={statusColors[item.name] ?? '#64748b'} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {statusData.map(item => (
                  <span key={item.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[item.name] ?? '#64748b' }} />
                    {item.name} <strong className="tabular-nums text-foreground">{item.value}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div><h2 className="font-semibold text-foreground">Assigned devices</h2><p className="mt-1 text-xs text-muted-foreground">Live status and latest telemetry</p></div>
          <span className="text-xs text-muted-foreground">{devicesQuery.data?.totalElements ?? 0} total</span>
        </div>
        {devicesQuery.isLoading ? (
          <div className="space-y-3 p-5"><div className="h-10 animate-pulse rounded-lg bg-muted" /><div className="h-10 animate-pulse rounded-lg bg-muted" /></div>
        ) : devices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Server className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No devices assigned yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your administrator can assign network devices to your account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Device</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">CPU</th><th className="px-5 py-3">Memory</th><th className="px-5 py-3">Latency</th></tr></thead>
              <tbody className="divide-y">
                {devices.map(device => <tr key={device.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3"><strong className="block font-medium text-foreground">{device.name}</strong><span className="text-xs text-muted-foreground">{device.ipAddress}</span></td>
                  <td className="px-5 py-3 text-muted-foreground">{device.site}</td>
                  <td className="px-5 py-3"><Badge variant={device.status === 'UP' ? 'up' : device.status === 'DOWN' ? 'down' : 'warning'}>{device.status}</Badge></td>
                  <td className="px-5 py-3 tabular-nums">{formatMetric(device.latestCpuUsage, '%')}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMetric(device.latestMemoryUsage, '%')}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMetric(device.latestLatencyMs, ' ms')}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div><h2 className="font-semibold text-foreground">Recent alerts</h2><p className="mt-1 text-xs text-muted-foreground">Alerts tied to your assigned devices</p></div>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </div>
        {alertsQuery.isLoading ? <div className="p-5"><div className="h-10 animate-pulse rounded-lg bg-muted" /></div> : alertsQuery.isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Alerts are unavailable right now.</p>
        ) : alerts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No alerts for your assigned devices.</p>
        ) : <div className="divide-y">
          {alerts.slice(0, 5).map(alert => <div key={alert.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><strong className="text-sm font-medium text-foreground">{alert.title}</strong><p className="mt-1 text-xs text-muted-foreground">{alert.deviceName} · {alert.message}</p></div>
            <div className="flex items-center gap-2"><Badge variant={alert.severity === 'CRITICAL' ? 'critical' : alert.severity === 'WARNING' ? 'warning' : 'info'}>{alert.severity}</Badge><Badge variant={alert.status === 'ACTIVE' ? 'down' : 'secondary'}>{alert.status}</Badge></div>
          </div>)}
        </div>}
      </section>
    </div>
  );
};

export const CustomerAlertsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-alerts'],
    queryFn: () => apiClient.getCustomerAlerts(0, 100),
    refetchInterval: 10000,
  });
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-foreground">My alerts</h1><p className="mt-1 text-sm text-muted-foreground">Only alerts associated with devices assigned to your account are shown.</p></div>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">{(error as Error).message}</p>}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? <div className="space-y-3 p-5"><div className="h-10 animate-pulse rounded-lg bg-muted" /><div className="h-10 animate-pulse rounded-lg bg-muted" /></div>
          : data?.content.length ? <div className="divide-y">{data.content.map(alert => <article key={alert.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-sm font-semibold text-foreground">{alert.title}</h2><p className="mt-1 text-xs text-muted-foreground">{alert.deviceName} · {alert.deviceIp} · {alert.message}</p></div>
            <div className="flex items-center gap-2"><Badge variant={alert.severity === 'CRITICAL' ? 'critical' : alert.severity === 'WARNING' ? 'warning' : 'info'}>{alert.severity}</Badge><Badge variant={alert.status === 'ACTIVE' ? 'down' : 'secondary'}>{alert.status}</Badge></div>
          </article>)}</div>
          : <p className="px-6 py-12 text-center text-sm text-muted-foreground">No alerts for your assigned devices.</p>}
      </section>
    </div>
  );
};

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
    <div className="rounded-lg bg-indigo-600/10 p-3 text-indigo-600 dark:text-indigo-400">{icon}</div>
    <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p></div>
  </div>
);

function formatMetric(value: number | undefined, suffix: string): string {
  return value == null ? '—' : `${value.toFixed(1)}${suffix}`;
}

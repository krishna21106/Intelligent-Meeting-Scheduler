import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Plus,
  Network,
  ShieldCheck,
  Building2,
  HardDrive,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: summary, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => apiClient.getDashboardSummary(),
    refetchInterval: 10000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) =>
      apiClient.handleAlertAction({ alertIds: [alertId], action: 'ACKNOWLEDGE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted/60 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/60 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-muted/60 rounded-2xl" />
          <div className="h-80 bg-muted/60 rounded-2xl" />
        </div>
      </div>
    );
  }

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

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'critical';
      case 'WARNING':
        return 'warning';
      default:
        return 'info';
    }
  };

  const availabilityPct =
    summary.totalDevices > 0
      ? Math.round(((summary.upDevices + summary.warningDevices) / summary.totalDevices) * 1000) / 10
      : 100;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Network Overview</h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time status of 40 infrastructure devices across 3 sites
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/topology')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition shadow-xs"
          >
            <Network className="w-3.5 h-3.5 text-indigo-500" />
            <span>Topology</span>
          </button>
          <button
            onClick={() => navigate('/devices?new=true')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Add Device</span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Poll Now</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Network Health Score"
          value={`${summary.networkHealthScore}%`}
          subValue="Calculated from availability & alerts"
          icon={Activity}
          variant={summary.networkHealthScore >= 90 ? 'success' : 'warning'}
          trend={{ value: summary.networkHealthScore >= 90 ? 'Optimal' : 'Degraded', isPositive: summary.networkHealthScore >= 90 }}
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          title="Managed Inventory"
          value={summary.totalDevices}
          subValue={`${summary.upDevices} Online • ${summary.warningDevices} Warning • ${summary.downDevices} Down`}
          icon={Server}
          variant="default"
          onClick={() => navigate('/devices')}
        />
        <StatCard
          title="Active Alerts"
          value={summary.activeAlertsCount}
          subValue={`${summary.criticalAlertsCount} Critical • ${summary.warningAlertsCount} Warning`}
          icon={AlertTriangle}
          variant={summary.criticalAlertsCount > 0 ? 'danger' : summary.warningAlertsCount > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          title="Online Availability"
          value={`${availabilityPct}%`}
          subValue="SLA commitment: 99.5%"
          icon={ShieldCheck}
          variant="success"
          trend={{ value: 'SLA Met', isPositive: true }}
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Site Health Matrix Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/devices?site=HQ - New York')}
          className="p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition cursor-pointer flex items-center justify-between group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-indigo-600 transition">HQ - New York</p>
              <p className="text-[11px] text-muted-foreground font-medium">18 Core Devices • 100% Up</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
        </div>

        <div
          onClick={() => navigate('/devices?site=East Datacenter')}
          className="p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition cursor-pointer flex items-center justify-between group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-indigo-600 transition">East Datacenter</p>
              <p className="text-[11px] text-muted-foreground font-medium">14 Spine & Leaf • High Traffic</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
        </div>

        <div
          onClick={() => navigate('/devices?site=West Branch')}
          className="p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition cursor-pointer flex items-center justify-between group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-indigo-600 transition">West Branch</p>
              <p className="text-[11px] text-muted-foreground font-medium">8 Edge & Access Switches</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
        </div>
      </div>

      {/* Main Charts & Attention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Traffic Area Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Aggregate Network Throughput</h2>
                <p className="text-xs text-muted-foreground">Inbound & Outbound traffic (Gbps) over the last hour</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-500">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500 shadow-xs" /> Inbound
                </span>
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-xs" /> Outbound
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.liveTraffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 8]} unit="G" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '1rem',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                    }}
                    formatter={(val: any) => [`${val} Gbps`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="inboundGbps"
                    name="Inbound"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#inboundGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outboundGbps"
                    name="Outbound"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#outboundGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
            <span>Diurnal Peak: ~7.2 Gbps (14:00 - 16:00 UTC)</span>
            <span className="font-mono font-medium text-foreground">Sampling Rate: 30s</span>
          </div>
        </div>

        {/* Devices Needing Attention */}
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-foreground">Attention Required</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold font-tabular border border-rose-500/20">
                {summary.devicesNeedingAttention?.length || 0} Issues
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Devices currently reporting DOWN or WARNING states
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {summary.devicesNeedingAttention && summary.devicesNeedingAttention.length > 0 ? (
                summary.devicesNeedingAttention.map((device: any) => (
                  <div
                    key={device.id}
                    onClick={() => navigate(`/devices/${device.id}`)}
                    className="p-3 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/70 transition cursor-pointer flex items-center justify-between group shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground group-hover:text-indigo-600 transition">
                          {device.name}
                        </span>
                        <Badge variant={getStatusBadgeVariant(device.status)} dot>
                          {device.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-tabular mt-0.5 block">
                        {device.ipAddress} • {device.site}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  All devices operational. No attention needed.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/devices?status=DOWN')}
            className="w-full mt-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted/70 transition text-center shadow-xs"
          >
            View Filtered Inventory
          </button>
        </div>
      </div>

      {/* Bottom Row: Top Busiest Interfaces & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Busiest Interfaces */}
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Top Busiest Interfaces</h2>
              <p className="text-xs text-muted-foreground">Highest bandwidth utilization in the last 5 minutes</p>
            </div>
            <button
              onClick={() => navigate('/ipam')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Manage Interfaces</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3.5">
            {summary.topBusiestInterfaces?.map((iface: any) => (
              <div key={iface.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-foreground">
                    <span>{iface.deviceName}</span>
                    <span className="text-muted-foreground ml-1.5 font-normal">({iface.name})</span>
                  </div>
                  <span className="font-bold font-tabular text-foreground">{iface.utilizationPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      iface.utilizationPct > 80
                        ? 'bg-rose-500'
                        : iface.utilizationPct > 60
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, iface.utilizationPct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts Feed with 1-Click Acknowledge */}
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Recent Incidents & Alerts</h2>
                <p className="text-xs text-muted-foreground">Latest threshold breaches and notifications</p>
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View All Alerts</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {summary.recentAlerts && summary.recentAlerts.length > 0 ? (
                summary.recentAlerts.slice(0, 4).map((alert: any) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/50 transition flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <Badge variant={getSeverityBadgeVariant(alert.severity)} className="mt-0.5">
                        {alert.severity}
                      </Badge>
                      <div>
                        <p className="text-xs font-bold text-foreground">{alert.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{alert.message}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-tabular">
                        {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {alert.status === 'ACTIVE' && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                        >
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  No incidents recorded in the current window.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

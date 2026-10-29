import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ExternalLink,
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

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => apiClient.getDashboardSummary(),
    refetchInterval: 10000, // Auto-refresh every 10s to match simulator cycle
  });

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-muted rounded-xl" />
          <div className="h-80 bg-muted rounded-xl" />
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Network Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time status of 40 infrastructure devices across 3 sites
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border shadow-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-muted-foreground">Simulator:</span>
            <span className="font-semibold text-foreground">Diurnal Active</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            Poll Now
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Health Score"
          value={`${summary.networkHealthScore}%`}
          subValue="Calculated from availability & alerts"
          icon={Activity}
          variant={summary.networkHealthScore >= 90 ? 'success' : 'warning'}
          trend={{ value: 'Nominal', isPositive: summary.networkHealthScore >= 90 }}
        />
        <StatCard
          title="Total Devices"
          value={summary.totalDevices}
          subValue={`${summary.upDevices} Online • ${summary.downDevices} Offline`}
          icon={Server}
          variant="default"
        />
        <StatCard
          title="Active Alerts"
          value={summary.activeAlertsCount}
          subValue={`${summary.criticalAlertsCount} Critical • ${summary.warningAlertsCount} Warning`}
          icon={AlertTriangle}
          variant={summary.criticalAlertsCount > 0 ? 'danger' : summary.warningAlertsCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Online Availability"
          value={`${Math.round(((summary.upDevices + summary.warningDevices) / summary.totalDevices) * 1000) / 10}%`}
          subValue="SLA target: 99.5%"
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Main Charts & Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Traffic Area Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Aggregate Network Throughput</h2>
              <p className="text-xs text-muted-foreground">Inbound & Outbound traffic (Gbps) over last hour</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-indigo-500">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Inbound
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Outbound
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
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 8]} unit="G" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val} Gbps`]}
                />
                <Area
                  type="monotone"
                  dataKey="inboundGbps"
                  name="Inbound"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#inboundGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="outboundGbps"
                  name="Outbound"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#outboundGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Devices Needing Attention */}
        <div className="bg-card rounded-xl border p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Attention Required</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-semibold font-tabular">
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
                    className="p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{device.name}</span>
                        <Badge variant={getStatusBadgeVariant(device.status)} dot>
                          {device.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-tabular">
                        {device.ipAddress} • {device.site}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
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
            className="w-full mt-4 py-2 text-xs font-medium rounded-lg border hover:bg-muted transition text-center"
          >
            View Filtered Inventory
          </button>
        </div>
      </div>

      {/* Bottom Row: Top 5 Busiest Interfaces & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Busiest Interfaces */}
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Top Busiest Interfaces</h2>
              <p className="text-xs text-muted-foreground">Highest bandwidth utilization in the last 5 minutes</p>
            </div>
            <button
              onClick={() => navigate('/ipam')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Manage Interfaces</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {summary.topBusiestInterfaces?.map((iface: any) => (
              <div key={iface.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-medium text-foreground">
                    <span>{iface.deviceName}</span>
                    <span className="text-muted-foreground ml-1.5 font-normal">({iface.name})</span>
                  </div>
                  <span className="font-semibold font-tabular text-foreground">{iface.utilizationPct}%</span>
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

        {/* Recent Alerts Feed */}
        <div className="bg-card rounded-xl border p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent Incidents & Alerts</h2>
                <p className="text-xs text-muted-foreground">Latest threshold breaches and notifications</p>
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>View All Alerts</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {summary.recentAlerts?.slice(0, 4).map((alert: any) => (
                <div
                  key={alert.id}
                  onClick={() => navigate('/alerts')}
                  className="p-3 rounded-xl border bg-muted/20 hover:bg-muted/50 transition cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <Badge variant={getSeverityBadgeVariant(alert.severity)} className="mt-0.5">
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{alert.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap font-tabular">
                    {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

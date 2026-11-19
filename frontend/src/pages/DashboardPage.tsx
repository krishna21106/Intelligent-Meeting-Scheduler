import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Network,
  Radio,
  ChevronRight,
  Zap,
} from 'lucide-react';
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

import { DashboardSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { HealthGauge } from '../components/dashboard/HealthGauge';
import { OsiHeatStrip } from '../components/dashboard/OsiHeatStrip';
import { KpiSparkCard } from '../components/dashboard/KpiSparkCard';

const DEFAULT_SUMMARY: DashboardSummary = {
  totalDevices: 40,
  upDevices: 37,
  downDevices: 1,
  warningDevices: 2,
  maintenanceDevices: 0,
  networkHealthScore: 94,
  activeAlertsCount: 3,
  criticalAlertsCount: 1,
  warningAlertsCount: 2,
  devicesBySite: {
    'Lab 101 - Networking': 16,
    'Lab 204 - Advanced Routing': 14,
    'Server Room': 10,
  },
  devicesByType: {
    ROUTER: 6,
    SWITCH: 18,
    FIREWALL: 4,
    ACCESS_POINT: 8,
    SERVER: 4,
  },
  liveTraffic: [
    { time: '10:00', inboundGbps: 3.8, outboundGbps: 2.9 },
    { time: '10:05', inboundGbps: 4.5, outboundGbps: 3.4 },
    { time: '10:10', inboundGbps: 6.2, outboundGbps: 5.1 },
    { time: '10:15', inboundGbps: 7.8, outboundGbps: 6.4 },
    { time: '10:20', inboundGbps: 6.9, outboundGbps: 5.8 },
    { time: '10:25', inboundGbps: 8.4, outboundGbps: 7.2 },
    { time: '10:30', inboundGbps: 7.9, outboundGbps: 6.9 },
    { time: '10:35', inboundGbps: 7.1, outboundGbps: 6.2 },
  ],
  topBusiestInterfaces: [
    {
      id: 1,
      deviceId: 1,
      deviceName: 'Lab1-Gateway-Router',
      name: 'GigabitEthernet0/0/1 (Lab Uplink)',
      status: 'UP',
      speedBps: 10000000000,
      inOctets: 894500000,
      outOctets: 765400000,
      inErrors: 0,
      outErrors: 0,
      lastUpdated: new Date().toISOString(),
      utilizationPct: 78.4,
    },
    {
      id: 2,
      deviceId: 5,
      deviceName: 'Lab1-Dist-Switch-01',
      name: 'TenGigE1/0/24 (Workstation Trunk)',
      status: 'UP',
      speedBps: 10000000000,
      inOctets: 4567000000,
      outOctets: 4123000000,
      inErrors: 1,
      outErrors: 0,
      lastUpdated: new Date().toISOString(),
      utilizationPct: 62.7,
    },
    {
      id: 3,
      deviceId: 3,
      deviceName: 'Perimeter-Lab-Firewall',
      name: 'ethernet1/1 (WAN Gateway)',
      status: 'UP',
      speedBps: 10000000000,
      inOctets: 1234000000,
      outOctets: 987000000,
      inErrors: 0,
      outErrors: 0,
      lastUpdated: new Date().toISOString(),
      utilizationPct: 54.1,
    },
  ],
  recentAlerts: [
    {
      id: 101,
      deviceId: 14,
      deviceName: 'Lab-Auth-Radius-01',
      deviceIp: '10.10.5.10',
      deviceSite: 'Server Room',
      severity: 'CRITICAL',
      title: 'Radius Authentication Server Unreachable',
      message: 'SNMP probe failure across 3 consecutive polling cycles',
      status: 'ACTIVE',
      triggeredAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    },
    {
      id: 102,
      deviceId: 13,
      deviceName: 'Lab-Wifi-AP-03',
      deviceIp: '10.10.4.12',
      deviceSite: 'Lab 101 - Networking',
      severity: 'WARNING',
      title: 'High Channel Interference Detected',
      message: 'Packet latency exceeding 80ms threshold on 5GHz band',
      status: 'ACTIVE',
      triggeredAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    },
  ],
  devicesNeedingAttention: [],
};

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [trafficPeriod, setTrafficPeriod] = useState<'1h' | '6h' | '24h'>('1h');

  // Query summary
  const { data: summaryData, isFetching, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => apiClient.getDashboardSummary(),
    refetchInterval: 10000,
  });

  const summary = summaryData || DEFAULT_SUMMARY;

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) =>
      apiClient.handleAlertAction({ alertIds: [alertId], action: 'ACKNOWLEDGE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* NOC Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              College Lab Network Operations Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time status across 3 educational lab segments • Autonomous 10s simulator engine
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/topology')}
            leftIcon={<Network className="w-3.5 h-3.5 text-indigo-500" />}
          >
            Topology Map
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/packet-analyzer')}
            leftIcon={<Radio className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Packet Analyzer
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Poll Now
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Sparkline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiSparkCard
          title="Network Health Score"
          value={`${summary.networkHealthScore}%`}
          subValue="Calculated from link availability & alerts"
          icon={Activity}
          variant={summary.networkHealthScore >= 90 ? 'success' : 'warning'}
          sparklineData={[82, 85, 88, 86, 90, 92, 94, 95, 94]}
          onClick={() => navigate('/alerts')}
        />

        <KpiSparkCard
          title="Monitored Lab Stations"
          value={summary.totalDevices}
          subValue={`${summary.upDevices} Online • ${summary.warningDevices} Warning • ${summary.downDevices} Down`}
          icon={Server}
          variant="cyber"
          sparklineData={[38, 39, 40, 40, 40, 39, 40, 40, 40]}
          onClick={() => navigate('/devices')}
        />

        <KpiSparkCard
          title="Active Lab Alerts"
          value={summary.activeAlertsCount}
          subValue={`${summary.criticalAlertsCount} Critical • ${summary.warningAlertsCount} Warning`}
          icon={AlertTriangle}
          variant={summary.criticalAlertsCount > 0 ? 'danger' : 'warning'}
          sparklineData={[5, 4, 6, 3, 2, 4, 3, 3, summary.activeAlertsCount]}
          onClick={() => navigate('/alerts')}
        />

        <KpiSparkCard
          title="Aggregate Throughput"
          value="8.4 Gbps"
          subValue="Peak ISP Uplink • 10G Fiber Backbone"
          icon={Zap}
          variant="default"
          sparklineData={[4.2, 5.1, 6.8, 8.2, 7.4, 9.1, 8.5, 7.9, 8.4]}
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Row 2: Live Traffic Area Chart + Health Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Traffic Area Chart (2 cols) */}
        <Card className="lg:col-span-2 p-5 flex flex-col justify-between" glow="cyber">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>Aggregate Network Throughput</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </h2>
                <p className="text-xs text-muted-foreground">Inbound & Outbound bandwidth telemetry</p>
              </div>

              {/* Legend & Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-indigo-500">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" /> Inbound
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Outbound
                  </span>
                </div>

                <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-[10px] font-semibold">
                  {(['1h', '6h', '24h'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setTrafficPeriod(p)}
                      className={`px-2 py-0.5 rounded ${
                        trafficPeriod === p ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={summary.liveTraffic}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="G" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inboundGbps"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inboundGrad)"
                    name="Inbound (Gbps)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outboundGbps"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#outboundGrad)"
                    name="Outbound (Gbps)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Peak: 9.1 Gbps In / 8.0 Gbps Out</span>
            <span className="font-mono text-emerald-500 font-semibold">Zero Packet Drop Detected</span>
          </div>
        </Card>

        {/* Health Gauge Card (1 col) */}
        <Card className="p-5 flex flex-col justify-between" glow="indigo">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-foreground tracking-tight">Composite Lab Health</h2>
              <Badge variant="success" size="sm" dot>
                Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Real-time health calculation based on active nodes, link loss, and security alerts
            </p>

            <HealthGauge
              score={summary.networkHealthScore}
              upCount={summary.upDevices}
              warningCount={summary.warningDevices}
              downCount={summary.downDevices}
            />
          </div>

          <div className="pt-3 border-t border-border/60 text-center">
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 inline-flex items-center gap-1 transition"
            >
              <span>View Detailed SLA Reports</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* Row 3: OSI 7-Layer Protocol Compliance Strip */}
      <OsiHeatStrip />

      {/* Row 4: Top Busiest Devices & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Busiest Interfaces */}
        <Card className="p-5" glow="none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Top Busiest Lab Interfaces</h2>
              <p className="text-xs text-muted-foreground">Highest bandwidth utilization ranking</p>
            </div>
            <button
              onClick={() => navigate('/devices')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {summary.topBusiestInterfaces.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => navigate(`/devices/${item.deviceId}`)}
                className="p-3 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/50 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 font-bold text-xs flex items-center justify-center flex-shrink-0 font-tabular">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.deviceName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-24 bg-muted/70 h-2 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className={`h-full rounded-full ${
                        (item.utilizationPct || 0) > 80
                          ? 'bg-rose-500'
                          : (item.utilizationPct || 0) > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${item.utilizationPct || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground font-tabular w-12 text-right">
                    {item.utilizationPct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Alerts Feed */}
        <Card className="p-5" glow="rose">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Recent Security & Network Alerts</h2>
                <p className="text-xs text-muted-foreground">Real-time incident detection feed</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
            >
              <span>All Alerts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {summary.recentAlerts.length > 0 ? (
              summary.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={alert.severity === 'CRITICAL' ? 'critical' : 'warning'}
                        size="sm"
                        dot
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">{alert.deviceName}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-tabular">
                      {new Date(alert.triggeredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-foreground leading-snug">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{alert.message}</p>

                  <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {alert.deviceIp} • {alert.deviceSite}
                    </span>
                    <button
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All lab segments operating normally. Zero active incidents.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

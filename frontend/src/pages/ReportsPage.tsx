import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import {
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Building,
  Server,
  Calendar,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['reportSummary', siteFilter],
    queryFn: () => apiClient.getReportSummary(siteFilter === 'ALL' ? undefined : siteFilter),
  });

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const blob = await apiClient.exportReportPdf(siteFilter === 'ALL' ? undefined : siteFilter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cnip-sla-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    setIsExportingCsv(true);
    try {
      const blob = await apiClient.exportReportCsv(siteFilter === 'ALL' ? undefined : siteFilter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cnip-sla-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
    } finally {
      setIsExportingCsv(false);
    }
  };

  if (isLoading || !report) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">SLA & Performance Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Availability compliance metrics, downtime analytics, and audit exports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
          >
            <option value="ALL">All Operational Sites</option>
            <option value="HQ - New York">HQ - New York</option>
            <option value="DC - Ashburn">DC - Ashburn</option>
            <option value="Branch - Frankfurt">Branch - Frankfurt</option>
          </select>

          <button
            onClick={handleDownloadCsv}
            disabled={isExportingCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border bg-card hover:bg-muted text-foreground transition shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>{isExportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generating...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall SLA Availability"
          value={`${report.overallSlaCompliance}%`}
          subValue="Service commitment: 99.50%"
          icon={CheckCircle}
          variant={report.overallSlaCompliance >= 99.5 ? 'success' : 'warning'}
          trend={{ value: 'Target Met', isPositive: report.overallSlaCompliance >= 99.5 }}
        />
        <StatCard
          title="Total Monitored Nodes"
          value={report.totalMonitoredDevices}
          subValue="In scope for SLA"
          icon={Server}
          variant="default"
        />
        <StatCard
          title="Degraded / Outage Nodes"
          value={report.outageDevicesCount}
          subValue="Requiring attention"
          icon={AlertTriangle}
          variant={report.outageDevicesCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Audit Reporting Period"
          value="Current Month"
          subValue="Rolling 30-day window"
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Site Compliance Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {report.siteSlaBreakdown?.map((site: any) => (
          <div key={site.siteName} className="bg-card rounded-xl border p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-sm text-foreground">{site.siteName}</h3>
              </div>
              <Badge variant={site.uptimePct >= 99.0 ? 'up' : 'warning'}>{site.uptimePct}%</Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Total Devices</span>
                <span className="font-semibold text-foreground font-tabular">{site.deviceCount}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Degraded Nodes</span>
                <span className="font-semibold text-foreground font-tabular">{site.degradedCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Outage and Unreliable Devices Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-foreground">Outage & Degraded Device Breakdown</h2>
          <p className="text-xs text-muted-foreground">Devices with recorded SLA violations or service degradation</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/60 text-muted-foreground border-b select-none">
              <tr>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">IP Address</th>
                <th className="px-4 py-3 font-semibold">Site</th>
                <th className="px-4 py-3 font-semibold">Uptime SLA</th>
                <th className="px-4 py-3 font-semibold">Downtime</th>
                <th className="px-4 py-3 font-semibold">Incident Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.unreliableDevices && report.unreliableDevices.length > 0 ? (
                report.unreliableDevices.map((d: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-semibold text-foreground">{d.deviceName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.deviceIp}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.site}</td>
                    <td className="px-4 py-3">
                      <Badge variant={d.uptimePct >= 98.0 ? 'warning' : 'down'} dot>
                        {d.uptimePct}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-tabular text-muted-foreground">{d.downtimeMinutes} mins</td>
                    <td className="px-4 py-3 text-xs font-tabular font-semibold text-foreground">{d.incidentCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    All devices are currently meeting 100% SLA uptime criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

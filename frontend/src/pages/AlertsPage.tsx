import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Alert, AlertRule } from '../types';
import { Badge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { ColumnDef } from '@tanstack/react-table';
import {
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'RULES'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedAlertIds, setSelectedAlertIds] = useState<number[]>([]);

  // Rule editing modal
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Queries
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', activeTab, severityFilter, search],
    queryFn: () =>
      apiClient.getAlerts({
        status: activeTab === 'RULES' ? undefined : activeTab,
        severity: severityFilter || undefined,
        search: search || undefined,
      }),
    enabled: activeTab !== 'RULES',
    refetchInterval: 10000,
  });

  const { data: rulesData } = useQuery({
    queryKey: ['alertRules'],
    queryFn: () => apiClient.getAlertRules(),
    enabled: activeTab === 'RULES',
  });

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: ({ alertIds, action }: { alertIds: number[]; action: 'ACKNOWLEDGE' | 'RESOLVE' }) =>
      apiClient.handleAlertAction({ alertIds, action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setSelectedAlertIds([]);
    },
  });

  const ruleMutation = useMutation({
    mutationFn: (rule: AlertRule) => apiClient.updateAlertRule(rule.id, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      setEditingRule(null);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && alertsData?.content) {
      setSelectedAlertIds(alertsData.content.map((a: Alert) => a.id));
    } else {
      setSelectedAlertIds([]);
    }
  };

  const handleToggleAlert = (id: number) => {
    if (selectedAlertIds.includes(id)) {
      setSelectedAlertIds(selectedAlertIds.filter((item) => item !== id));
    } else {
      setSelectedAlertIds([...selectedAlertIds, id]);
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

  const alertColumns: ColumnDef<Alert>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={
            alertsData?.content?.length
              ? selectedAlertIds.length === alertsData.content.length
              : false
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded-md border-border/80 text-indigo-600 focus:ring-indigo-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedAlertIds.includes(row.original.id)}
          onChange={() => handleToggleAlert(row.original.id)}
          className="rounded-md border-border/80 text-indigo-600 focus:ring-indigo-500"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => (
        <Badge variant={getSeverityBadgeVariant(row.original.severity)} dot>
          {row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Alert Title & Incident Details',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-foreground block hover:text-indigo-600 transition">
            {row.original.title}
          </span>
          <span className="text-xs text-muted-foreground block line-clamp-1 mt-0.5">
            {row.original.message}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'deviceName',
      header: 'Impacted Target',
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-bold text-foreground block">{row.original.deviceName}</span>
          <span className="text-muted-foreground font-mono block mt-0.5">{row.original.deviceIp}</span>
        </div>
      ),
    },
    {
      accessorKey: 'triggeredAt',
      header: 'Triggered Time',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-tabular">
          {new Date(row.original.triggeredAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Quick Action',
      cell: ({ row }) => {
        if (!hasRole(['ADMIN', 'OPERATOR'])) return null;
        return (
          <div className="flex items-center gap-2">
            {row.original.status === 'ACTIVE' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  actionMutation.mutate({ alertIds: [row.original.id], action: 'ACKNOWLEDGE' });
                }}
                disabled={actionMutation.isPending}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition shadow-xs"
              >
                Acknowledge
              </button>
            )}
            {row.original.status !== 'RESOLVED' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  actionMutation.mutate({ alertIds: [row.original.id], action: 'RESOLVE' });
                }}
                disabled={actionMutation.isPending}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition shadow-xs"
              >
                Resolve
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Alerts & Incidents</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              Real-time Triaging
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage active threshold alarms, operational ownership, and policy rules
          </p>
        </div>

        {hasRole(['ADMIN', 'OPERATOR']) && selectedAlertIds.length > 0 && (
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-2xl border border-border shadow-lg animate-in fade-in">
            <span className="text-xs font-bold px-3 text-foreground font-tabular">
              {selectedAlertIds.length} selected
            </span>
            <button
              onClick={() => actionMutation.mutate({ alertIds: selectedAlertIds, action: 'ACKNOWLEDGE' })}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm shadow-indigo-600/20"
            >
              Acknowledge All
            </button>
            <button
              onClick={() => actionMutation.mutate({ alertIds: selectedAlertIds, action: 'RESOLVE' })}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm shadow-emerald-600/20"
            >
              Resolve All
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/80 space-x-6 text-sm font-medium">
        {[
          { key: 'ACTIVE', label: 'Active Incidents' },
          { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
          { key: 'RESOLVED', label: 'Resolved History' },
          { key: 'RULES', label: 'Threshold Rules' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              setSelectedAlertIds([]);
            }}
            className={`pb-3 relative transition-all text-xs sm:text-sm ${
              activeTab === tab.key
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
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

      {/* Content for Alerts List */}
      {activeTab !== 'RULES' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts by title or device..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="p-1 rounded text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <DataTable
            columns={alertColumns}
            data={alertsData?.content || []}
            isLoading={alertsLoading}
            emptyMessage={`No ${activeTab.toLowerCase()} alerts at this time.`}
          />
        </div>
      ) : (
        /* Content for Threshold Rules Table */
        <div className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border/80">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-foreground">Configured Telemetry Threshold Rules</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alerts trigger automatically when monitored telemetry violates these criteria
            </p>
          </div>
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[11px] uppercase tracking-wider bg-muted/50 text-muted-foreground border-b border-border/80 select-none">
              <tr>
                <th className="px-5 py-3.5 font-bold">Rule Name</th>
                <th className="px-5 py-3.5 font-bold">Metric</th>
                <th className="px-5 py-3.5 font-bold">Condition</th>
                <th className="px-5 py-3.5 font-bold">Threshold</th>
                <th className="px-5 py-3.5 font-bold">Duration</th>
                <th className="px-5 py-3.5 font-bold">Severity</th>
                <th className="px-5 py-3.5 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rulesData?.map((rule: AlertRule) => (
                <tr key={rule.id} className="hover:bg-muted/30 transition">
                  <td className="px-5 py-4 font-bold text-foreground">{rule.name}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2.5 py-0.5 rounded-lg bg-muted/60 border border-border/50 font-semibold text-foreground">
                      {rule.metricType}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground font-medium">
                    {rule.operator.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-xs text-foreground">
                    {rule.thresholdValue} {rule.metricType === 'CPU' || rule.metricType === 'MEMORY' ? '%' : 'ms'}
                  </td>
                  <td className="px-5 py-4 text-xs font-tabular text-muted-foreground">
                    {rule.durationSeconds > 0 ? `${rule.durationSeconds / 60} mins` : 'Immediate'}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={getSeverityBadgeVariant(rule.severity)} dot>
                      {rule.severity}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    {hasRole('ADMIN') && (
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border/80 hover:bg-muted text-foreground transition shadow-xs"
                      >
                        Edit Rule
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <Modal
          isOpen={!!editingRule}
          onClose={() => setEditingRule(null)}
          title={`Edit Rule: ${editingRule.name}`}
          description="Adjust threshold trigger criteria and duration parameters"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ruleMutation.mutate(editingRule);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Threshold Value
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={editingRule.thresholdValue}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, thresholdValue: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Persistence Duration (seconds)
              </label>
              <input
                type="number"
                required
                value={editingRule.durationSeconds}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, durationSeconds: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                E.g., 300 seconds = 5 minutes sustained violation before alarm triggers
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border/80 hover:bg-muted text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={ruleMutation.isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
              >
                {ruleMutation.isPending ? 'Saving...' : 'Update Rule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

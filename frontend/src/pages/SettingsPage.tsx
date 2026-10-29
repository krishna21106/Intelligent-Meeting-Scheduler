import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { NotificationSetting } from '../types';
import {
  Bell,
  Mail,
  Send,
  Radio,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [notificationConfig, setNotificationConfig] = useState<NotificationSetting>({
    id: 1,
    emailEnabled: true,
    recipientEmails: 'noc@cnip.network, oncall@cnip.network',
    webhookEnabled: true,
    webhookUrl: 'https://webhook.cnip.network/alerts/v1/incoming',
    minSeverity: 'WARNING',
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Failure Injection State
  const [injectDeviceId, setInjectDeviceId] = useState<number>(1);
  const [injectStatus, setInjectStatus] = useState<string>('DOWN');
  const [injectResult, setInjectResult] = useState<string | null>(null);

  // Queries
  const { data: settingsData } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => apiClient.getNotificationSettings(),
  });

  const { data: simulatorStatus } = useQuery({
    queryKey: ['simulatorStatus'],
    queryFn: () => apiClient.getSimulatorStatus(),
  });

  const { data: devicesList } = useQuery({
    queryKey: ['devicesAll'],
    queryFn: () => apiClient.getDevices({ size: 100 }),
  });

  useEffect(() => {
    if (settingsData) {
      setNotificationConfig(settingsData);
    }
  }, [settingsData]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (dto: NotificationSetting) => apiClient.updateNotificationSettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      setTestResult({ success: true, message: 'Notification settings saved successfully' });
    },
  });

  const handleTestProbe = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.testNotification();
      setTestResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleInjectFault = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.injectSimulatorStatus(injectDeviceId, injectStatus);
      setInjectResult(`Injected status ${res.newStatus} on ${res.deviceName}`);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (err: any) {
      setInjectResult(`Failed to inject: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System & Notification Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Outbound alerting webhooks, email relays, and telemetry simulator failure injection
        </p>
      </div>

      {/* SECTION 1: ALERT NOTIFICATION CHANNELS */}
      <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b">
          <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Outbound Alert Routing</h2>
            <p className="text-xs text-muted-foreground">Configure webhook dispatch and email notifications for active incidents</p>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSettingsMutation.mutate(notificationConfig);
          }}
          className="space-y-5"
        >
          {/* Email Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> Email Alert Dispatch
              </label>
              <input
                type="checkbox"
                checked={notificationConfig.emailEnabled}
                onChange={(e) =>
                  setNotificationConfig({ ...notificationConfig, emailEnabled: e.target.checked })
                }
                className="rounded border-border"
              />
            </div>
            <input
              type="text"
              value={notificationConfig.recipientEmails || ''}
              onChange={(e) =>
                setNotificationConfig({ ...notificationConfig, recipientEmails: e.target.value })
              }
              placeholder="noc@cnip.network, alerts@company.com"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Webhook Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Webhook Integration (Slack / PagerDuty / Opsgenie)
              </label>
              <input
                type="checkbox"
                checked={notificationConfig.webhookEnabled}
                onChange={(e) =>
                  setNotificationConfig({ ...notificationConfig, webhookEnabled: e.target.checked })
                }
                className="rounded border-border"
              />
            </div>
            <input
              type="url"
              value={notificationConfig.webhookUrl || ''}
              onChange={(e) =>
                setNotificationConfig({ ...notificationConfig, webhookUrl: e.target.value })
              }
              placeholder="https://webhook.cnip.network/alerts/v1/incoming"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Min Severity */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase text-muted-foreground">
              Minimum Incident Severity For Dispatch
            </label>
            <select
              value={notificationConfig.minSeverity || 'WARNING'}
              onChange={(e) =>
                setNotificationConfig({ ...notificationConfig, minSeverity: e.target.value as any })
              }
              className="w-full sm:w-64 px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CRITICAL">CRITICAL only</option>
              <option value="WARNING">WARNING & CRITICAL</option>
              <option value="INFO">All Notifications (INFO+)</option>
            </select>
          </div>

          {hasRole('ADMIN') && (
            <div className="flex items-center justify-between pt-4 border-t">
              <button
                type="button"
                onClick={handleTestProbe}
                disabled={isTesting}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border hover:bg-muted text-foreground transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTesting ? 'Sending Probe...' : 'Send Test Probe'}</span>
              </button>

              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Routing Rules'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* SECTION 2: SIMULATOR & FAULT INJECTION CONTROLS */}
      <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b">
          <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Built-in Telemetry Simulator Engine</h2>
            <p className="text-xs text-muted-foreground">Controls for background device simulation and failure injection</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-muted/30 border">
            <span className="text-muted-foreground block">Simulator State</span>
            <span className="font-semibold text-emerald-500 mt-1 block flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Active (Autonomous)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border">
            <span className="text-muted-foreground block">Polling Interval</span>
            <span className="font-semibold text-foreground mt-1 block font-tabular">10,000 ms (10 seconds)</span>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border">
            <span className="text-muted-foreground block">Simulated Devices</span>
            <span className="font-semibold text-foreground mt-1 block font-tabular">
              {simulatorStatus?.simulatedDeviceCount || 40} Nodes
            </span>
          </div>
        </div>

        {/* Fault Injection Tool */}
        {hasRole('ADMIN') && (
          <div className="pt-4 border-t space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Failure & Recovery Injection Probe
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulate a sudden hardware outage or degraded link to test alert triggering
              </p>
            </div>

            {injectResult && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                {injectResult}
              </div>
            )}

            <form onSubmit={handleInjectFault} className="flex flex-col sm:flex-row gap-3">
              <select
                value={injectDeviceId}
                onChange={(e) => setInjectDeviceId(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {devicesList?.content?.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.ipAddress}) - Current: {d.status}
                  </option>
                ))}
              </select>

              <select
                value={injectStatus}
                onChange={(e) => setInjectStatus(e.target.value)}
                className="w-full sm:w-36 px-3 py-2 rounded-lg border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="DOWN">DOWN (Failure)</option>
                <option value="WARNING">WARNING (Degraded)</option>
                <option value="UP">UP (Nominal)</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm whitespace-nowrap"
              >
                Inject Failure
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

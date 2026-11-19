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
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const { template, setTemplate } = useTheme();

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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System & Console Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visual templates, outbound alerting webhooks, email relays, and telemetry simulator failure injection
        </p>
      </div>

      {/* SECTION 0: VISUAL TEMPLATE & THEME SWITCHER */}
      <Card glow={template === 'cyber-dark' ? 'cyber' : 'none'}>
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <div>
              <CardTitle>Console Visual Template</CardTitle>
              <CardDescription>
                Choose between high-contrast Dark NOC mode or clean academic lab styling
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Cyber Dark NOC */}
            <div
              onClick={() => setTemplate('cyber-dark')}
              className={`relative cursor-pointer rounded-2xl p-4 border transition-all ${
                template === 'cyber-dark'
                  ? 'border-cyan-500/60 bg-cyan-500/5 ring-2 ring-cyan-500/20 shadow-md'
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-foreground text-sm">Cyber Dark NOC</span>
                </div>
                {template === 'cyber-dark' && (
                  <Badge variant="cyber" size="sm" dot pulse>
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Deep midnight/navy background with neon cyan and emerald telemetry glow, subtle card borders, and dark cyber grid. Default operations view.
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="h-4 w-12 rounded bg-slate-900 border border-cyan-500/30 flex items-center px-1">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" />
                </div>
                <div className="h-4 w-8 rounded bg-slate-800 border border-emerald-500/30" />
                <div className="h-4 w-16 rounded bg-slate-900 border border-indigo-500/30" />
              </div>
            </div>

            {/* Option 2: Clean Light Campus */}
            <div
              onClick={() => setTemplate('clean-light')}
              className={`relative cursor-pointer rounded-2xl p-4 border transition-all ${
                template === 'clean-light'
                  ? 'border-indigo-600/60 bg-indigo-500/5 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-foreground text-sm">Clean Light Campus</span>
                </div>
                {template === 'clean-light' && (
                  <Badge variant="default" size="sm" dot>
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Crisp slate-50 background with white card surfaces, sharp contrast, and deep corporate blue accents. Ideal for bright lecture halls and projectors.
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="h-4 w-12 rounded bg-white border border-slate-300 flex items-center px-1">
                  <div className="h-2 w-2 rounded-full bg-indigo-600" />
                </div>
                <div className="h-4 w-8 rounded bg-slate-100 border border-slate-300" />
                <div className="h-4 w-16 rounded bg-white border border-slate-300" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1: ALERT NOTIFICATION CHANNELS */}
      <Card>
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <CardTitle>Outbound Alert Routing</CardTitle>
              <CardDescription>
                Configure webhook dispatch and email notifications for active incidents
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
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
                placeholder="noc@cnip.network, alerts@college.edu"
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Webhook Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Webhook Integration (Slack / Discord / Teams)
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
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full sm:w-64 px-3 py-2 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CRITICAL">CRITICAL only</option>
                <option value="WARNING">WARNING & CRITICAL</option>
                <option value="INFO">All Notifications (INFO+)</option>
              </select>
            </div>

            {hasRole('ADMIN') && (
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestProbe}
                  disabled={isTesting}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  {isTesting ? 'Sending Probe...' : 'Send Test Probe'}
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  isLoading={updateSettingsMutation.isPending}
                >
                  Save Routing Rules
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* SECTION 2: SIMULATOR & FAULT INJECTION CONTROLS */}
      <Card>
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <CardTitle>Built-in Telemetry Simulator Engine</CardTitle>
              <CardDescription>Controls for background lab device simulation and failure injection</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/30 border">
              <span className="text-muted-foreground block text-[11px]">Simulator State</span>
              <span className="font-semibold text-emerald-500 mt-1 flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Active (Autonomous)
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/30 border">
              <span className="text-muted-foreground block text-[11px]">Polling Interval</span>
              <span className="font-semibold text-foreground mt-1 block font-tabular text-xs">10,000 ms (10s)</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/30 border">
              <span className="text-muted-foreground block text-[11px]">Simulated Lab Nodes</span>
              <span className="font-semibold text-foreground mt-1 block font-tabular text-xs">
                {simulatorStatus?.simulatedDeviceCount || 40} Nodes
              </span>
            </div>
          </div>

          {/* Fault Injection Tool */}
          {hasRole('ADMIN') && (
            <div className="pt-4 border-t border-border/60 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Failure & Recovery Injection Probe
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulate a sudden hardware outage or degraded link to test alert triggering
                </p>
              </div>

              {injectResult && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                  {injectResult}
                </div>
              )}

              <form onSubmit={handleInjectFault} className="flex flex-col sm:flex-row gap-3">
                <select
                  value={injectDeviceId}
                  onChange={(e) => setInjectDeviceId(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-xl border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full sm:w-36 px-3 py-2 rounded-xl border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="DOWN">DOWN (Failure)</option>
                  <option value="WARNING">WARNING (Degraded)</option>
                  <option value="UP">UP (Nominal)</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>

                <Button type="submit" variant="destructive" size="sm">
                  Inject Failure
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

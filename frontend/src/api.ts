import type { TopologyGraph } from "./types";

export type Device = {
  id: number;
  name: string;
  ipAddress: string;
  deviceType: string;
  vendor: string;
  model: string;
  site: string;
  location: string;
  status: "UP" | "WARNING" | "DOWN" | "MAINTENANCE";
  tags: string;
  lastSeen: string;
  latestCpuUsage?: number;
  latestMemoryUsage?: number;
  latestLatencyMs?: number;
};

export type Alert = {
  id: number;
  deviceId: number;
  deviceName: string;
  severity: string;
  title: string;
  message: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  triggeredAt: string;
  acknowledgedBy?: string;
};

export type Dashboard = {
  totalDevices: number;
  online: number;
  warning: number;
  offline: number;
  healthScore: number;
  activeAlerts: number;
  traffic: { time: string; inbound: number; outbound: number }[];
  busiestDevices: { id: number; name: string; interfaceName: string; site: string; utilization: number }[];
  recentAlerts: Alert[];
  attentionDevices: { id: number; name: string; site: string; status: string }[];
};

export type InterfaceItem = {
  id: number; deviceId: number; deviceName?: string; name: string; ipAddress?: string;
  status: string; speedBps: number; inOctets: number; outOctets: number;
  inErrors: number; outErrors: number; utilizationPct?: number;
};
export type Metric = {
  id: number; cpuUsage: number; memoryUsage: number; latencyMs: number;
  bytesInPerSec: number; bytesOutPerSec: number; uptimeSeconds: number; recordedAt: string;
};
export type ConfigBackup = {
  id: number; deviceId: number; deviceName: string; version: number; backupType: string;
  configuration: string; checksum: string; backedUpAt: string; backedUpBy: string;
};
export type IpAddress = {
  id: number; ipAddress: string; subnet: string; status: string; deviceName?: string;
  vlanNumber?: number; vlanName?: string; dnsName?: string;
};
export type Vlan = { id: number; vlanId: number; name: string; subnet: string; allocatedIpCount: number; totalIpCapacity: number };
export type Report = {
  period: string; overallSlaPercentage: number; totalOutages: number; totalDowntimeMinutes: number;
  averageLatencyMs: number; averageCpuUsage: number; averageMemoryUsage: number;
  siteSlas: { site: string; slaPercentage: number; totalDevices: number; degradedCount: number }[];
};
export type AuditItem = { id: number; username: string; action: string; entityType: string; entityId?: string; details?: string; createdAt: string };

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
};

export const token = () => localStorage.getItem("cnip-token");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: async (username: string, password: string) => {
    const response = await request<{ token: string; user: { username: string; role: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return { token: response.token, username: response.user.username, role: response.user.role };
  },
  dashboard: async () => {
    const [summary, inventory] = await Promise.all([request<{
      totalDevices: number; upDevices: number; downDevices: number; warningDevices: number;
      networkHealthScore: number; activeAlertsCount: number;
      liveTraffic: { timestamp: string; inboundGbps: number; outboundGbps: number }[];
      topBusiestInterfaces: { id: number; deviceId: number; deviceName: string; name: string; utilizationPct: number }[];
      recentAlerts: Alert[];
      devicesNeedingAttention: { id: number; name: string; site: string; status: string }[];
    }>("/dashboard/summary"), request<{ content: Device[] }>("/devices?page=0&size=100")]);
    const sites = new Map(inventory.content.map(device => [device.id, device.site]));
    return {
      totalDevices: summary.totalDevices,
      online: summary.upDevices,
      warning: summary.warningDevices,
      offline: summary.downDevices,
      healthScore: Math.round(summary.networkHealthScore),
      activeAlerts: summary.activeAlertsCount,
      traffic: summary.liveTraffic.map(point => ({ time: point.timestamp, inbound: point.inboundGbps, outbound: point.outboundGbps })),
      busiestDevices: summary.topBusiestInterfaces.map(item => ({
        id: item.deviceId, name: item.deviceName, interfaceName: item.name,
        site: sites.get(item.deviceId) ?? "—", utilization: Math.round(item.utilizationPct),
      })),
      recentAlerts: summary.recentAlerts,
      attentionDevices: summary.devicesNeedingAttention,
    } satisfies Dashboard;
  },
  devices: async (page = 0, q = "", size = 10) => {
    const result = await request<{ content: Device[]; totalElements: number; totalPages: number }>(
      `/devices?page=${page}&size=${size}${q ? `&search=${encodeURIComponent(q)}` : ""}`,
    );
    return result;
  },
  device: (id: number) => request<Device>(`/devices/${id}`),
  createDevice: (device: Partial<Device>) =>
    request<Device>("/devices", { method: "POST", body: JSON.stringify({
      ...device,
      deviceType: device.deviceType?.toUpperCase().replaceAll(" ", "_"),
    }) }),
  alerts: (status = "", deviceId?: number) => request<Page<Alert>>(
    `/alerts?page=0&size=50${status ? `&status=${status}` : ""}${deviceId ? `&deviceId=${deviceId}` : ""}`,
  ),
  acknowledge: (id: number) => request<void>("/alerts/action", {
    method: "POST", body: JSON.stringify({ alertIds: [id], action: "ACKNOWLEDGE" }),
  }),
  resolve: (id: number) => request<void>("/alerts/action", {
    method: "POST", body: JSON.stringify({ alertIds: [id], action: "RESOLVE" }),
  }),
  metrics: (deviceId: number) => request<Metric[]>(`/monitoring/devices/${deviceId}/metrics?hours=24`),
  interfaces: (deviceId: number) => request<InterfaceItem[]>(`/ipam/devices/${deviceId}/interfaces`),
  configs: (deviceId: number) => request<ConfigBackup[]>(`/configs/devices/${deviceId}`),
  backupConfig: (deviceId: number) => request<ConfigBackup>(`/configs/devices/${deviceId}/backup`, { method: "POST" }),
  configDiff: (deviceId: number, versionA: number, versionB: number) =>
    request<{ versionA: number; versionB: number; lines: { type: string; text: string }[] }>(
      `/configs/devices/${deviceId}/diff?versionA=${versionA}&versionB=${versionB}`,
    ),
  topology: (site = "") => request<TopologyGraph>(`/topology${site ? `?site=${encodeURIComponent(site)}` : ""}`),
  vlans: () => request<Vlan[]>("/ipam/vlans"),
  ips: () => request<Page<IpAddress>>("/ipam/ips?page=0&size=100"),
  createVlan: (vlan: { vlanId: number; name: string; subnet: string; description?: string }) =>
    request<Vlan>("/ipam/vlans", { method: "POST", body: JSON.stringify(vlan) }),
  allocateIp: (item: { ipAddress: string; subnet: string; status: string; vlanId: number; dnsName?: string }) =>
    request<IpAddress>("/ipam/ips", { method: "POST", body: JSON.stringify(item) }),
  releaseIp: (id: number) => request<void>(`/ipam/ips/${id}`, { method: "DELETE" }),
  report: () => request<Report>("/reports/summary"),
  audit: () => request<Page<AuditItem>>("/audit-logs?page=0&size=50"),
  notificationSettings: () => request<{ emailEnabled: boolean; recipientEmails?: string; webhookEnabled: boolean; webhookUrl?: string; minSeverity: string }>("/settings/notifications"),
  saveNotificationSettings: (settings: { emailEnabled: boolean; recipientEmails?: string; webhookEnabled: boolean; webhookUrl?: string; minSeverity: string }) =>
    request("/settings/notifications", { method: "PUT", body: JSON.stringify(settings) }),
  importDevices: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/devices/import/csv", {
      method: "POST",
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      body: form,
    });
    if (!response.ok) throw new Error("CSV import failed. Check the file format and permissions.");
    return response.json() as Promise<{ count: number }>;
  },
  download: async (path: string, filename: string) => {
    const response = await fetch(`/api${path}`, {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};

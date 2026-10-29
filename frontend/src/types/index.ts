export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'CUSTOMER';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  roleName?: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export type DeviceType = 'ROUTER' | 'SWITCH' | 'FIREWALL' | 'ACCESS_POINT' | 'SERVER';
export type DeviceStatus = 'UP' | 'DOWN' | 'WARNING' | 'MAINTENANCE';

export interface DeviceInterface {
  id: number;
  deviceId: number;
  deviceName?: string;
  name: string;
  macAddress?: string;
  ipAddress?: string;
  status: 'UP' | 'DOWN';
  speedBps: number;
  inOctets: number;
  outOctets: number;
  inErrors: number;
  outErrors: number;
  lastUpdated: string;
  utilizationPct?: number;
}

export interface Device {
  id: number;
  name: string;
  ipAddress: string;
  deviceType: DeviceType;
  vendor: string;
  model: string;
  site: string;
  location?: string;
  status: DeviceStatus;
  snmpVersion: string;
  snmpCommunity: string;
  snmpPort: number;
  tags?: string;
  customerId?: number;
  lastSeen?: string;
  createdAt: string;
  interfaces?: DeviceInterface[];
  latestCpuUsage?: number;
  latestMemoryUsage?: number;
  latestLatencyMs?: number;
  latestPacketLossPct?: number;
  latestUptimeSeconds?: number;
}

export interface DeviceCreateUpdateDto {
  name: string;
  ipAddress: string;
  deviceType: DeviceType;
  vendor: string;
  model: string;
  site: string;
  location?: string;
  status?: DeviceStatus;
  snmpVersion?: string;
  snmpCommunity?: string;
  snmpPort?: number;
  tags?: string;
  customerId?: number;
}

export interface CustomerSummary {
  id: number;
  username: string;
  email: string;
}

export interface CustomerDevice {
  id: number;
  name: string;
  ipAddress: string;
  deviceType: DeviceType;
  vendor: string;
  model: string;
  site: string;
  location?: string;
  status: DeviceStatus;
  lastSeen?: string;
  latestCpuUsage?: number;
  latestMemoryUsage?: number;
  latestLatencyMs?: number;
}

export interface Metric {
  id: number;
  deviceId: number;
  cpuUsage: number;
  memoryUsage: number;
  latencyMs: number;
  packetLossPct: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
  uptimeSeconds: number;
  recordedAt: string;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: number;
  deviceId: number;
  deviceName: string;
  deviceIp: string;
  deviceSite: string;
  ruleId?: number;
  ruleName?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
}

export interface AlertRule {
  id: number;
  name: string;
  metricType: string;
  operator: string;
  thresholdValue: number;
  durationSeconds: number;
  severity: AlertSeverity;
  enabled: boolean;
}

export interface AlertActionDto {
  alertIds: number[];
  action: 'ACKNOWLEDGE' | 'RESOLVE';
}

export interface TrafficPoint {
  time?: string;
  timestamp?: string;
  inboundGbps: number;
  outboundGbps: number;
}

export interface DashboardSummary {
  totalDevices: number;
  upDevices: number;
  downDevices: number;
  warningDevices: number;
  maintenanceDevices: number;
  networkHealthScore: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  devicesBySite: Record<string, number>;
  devicesByType: Record<string, number>;
  liveTraffic: TrafficPoint[];
  topBusiestInterfaces: DeviceInterface[];
  recentAlerts: Alert[];
  devicesNeedingAttention: Device[];
}

export interface TopologyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    id: number;
    label: string;
    ip: string;
    status: DeviceStatus;
    deviceType: DeviceType;
    vendor: string;
    model: string;
    site: string;
    location?: string;
    cpu?: number;
    memory?: number;
    latency?: number;
  };
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
  data?: {
    sourceInterface: string;
    targetInterface: string;
    linkStatus: string;
    utilization: number;
    capacityMbps: number;
  };
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface Vlan {
  id: number;
  vlanId: number;
  name: string;
  subnet: string;
  description?: string;
  allocatedIpCount: number;
  totalIpCapacity: number;
}

export interface IpAddressItem {
  id: number;
  ipAddress: string;
  subnet: string;
  status: 'ALLOCATED' | 'AVAILABLE' | 'RESERVED';
  deviceId?: number;
  deviceName?: string;
  vlanId?: number;
  vlanNumber?: number;
  vlanName?: string;
  dnsName?: string;
}

export interface ConfigBackup {
  id: number;
  deviceId: number;
  deviceName: string;
  version: number;
  backupType: string;
  configuration: string;
  checksum: string;
  backedUpAt: string;
  backedUpBy: string;
}

export interface DiffLine {
  type?: 'UNCHANGED' | 'ADDED' | 'REMOVED';
  changeType?: 'UNCHANGED' | 'ADDED' | 'REMOVED';
  text?: string;
  content?: string;
  lineNumber?: number;
  lineNumberA?: number;
  lineNumberB?: number;
}

export interface ConfigDiff {
  deviceId: number;
  deviceName?: string;
  versionA: number;
  versionB: number;
  timestampA?: string;
  timestampB?: string;
  lines?: DiffLine[];
  diffLines?: DiffLine[];
}

export interface AuditLogItem {
  id: number;
  username: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  clientIp?: string;
  createdAt: string;
  timestamp?: string;
}

export interface ReportSummary {
  period?: string;
  overallSlaCompliance: number;
  overallSlaPercentage?: number;
  totalMonitoredDevices: number;
  outageDevicesCount: number;
  totalOutages?: number;
  totalDowntimeMinutes?: number;
  averageLatencyMs?: number;
  averageCpuUsage?: number;
  averageMemoryUsage?: number;
  siteSlaBreakdown: {
    siteName: string;
    uptimePct: number;
    deviceCount: number;
    degradedCount: number;
  }[];
  unreliableDevices: {
    deviceName: string;
    deviceIp: string;
    site: string;
    uptimePct: number;
    downtimeMinutes: number;
    incidentCount: number;
  }[];
}

export interface NotificationSetting {
  id?: number;
  emailEnabled: boolean;
  recipientEmails?: string;
  webhookEnabled: boolean;
  webhookUrl?: string;
  minSeverity: AlertSeverity;
  updatedAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

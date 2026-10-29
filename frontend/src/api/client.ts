import {
  AuthResponse,
  DashboardSummary,
  Device,
  DeviceCreateUpdateDto,
  Metric,
  Alert,
  AlertRule,
  AlertActionDto,
  TopologyGraph,
  Vlan,
  IpAddressItem,
  DeviceInterface,
  ConfigBackup,
  ConfigDiff,
  AuditLogItem,
  ReportSummary,
  NotificationSetting,
  PageResponse,
  User,
  CustomerSummary,
  CustomerDevice,
} from '../types';

const API_BASE = '/api';

export class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('cnip_token');
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('cnip_token');
      localStorage.removeItem('cnip_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  public async requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to download resource: ${response.statusText}`);
    }

    return response.blob();
  }

  // --- Auth ---
  auth = {
    login: (credentials: { username: string; password: string }): Promise<AuthResponse> =>
      this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (credentials: { username: string; email: string; password: string }): Promise<AuthResponse> =>
      this.request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    customers: (): Promise<CustomerSummary[]> => this.request<CustomerSummary[]>('/auth/customers'),
    me: (): Promise<User> => this.request<User>('/auth/me'),
  };

  getCustomerDevices = (page = 0, size = 100): Promise<PageResponse<CustomerDevice>> =>
    this.request<PageResponse<CustomerDevice>>(`/customer/devices?page=${page}&size=${size}`);

  getCustomerAlerts = (page = 0, size = 50): Promise<PageResponse<Alert>> =>
    this.request<PageResponse<Alert>>(`/customer/alerts?page=${page}&size=${size}`);

  // --- Convenience Direct Methods ---
  getDashboardSummary = (): Promise<DashboardSummary> =>
    this.request<DashboardSummary>('/dashboard/summary');

  getDevices = (params: {
    search?: string;
    site?: string;
    deviceType?: string;
    status?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  } = {}): Promise<PageResponse<Device>> => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.site) q.append('site', params.site);
    if (params.deviceType) q.append('deviceType', params.deviceType);
    if (params.status) q.append('status', params.status);
    if (params.page !== undefined) q.append('page', params.page.toString());
    if (params.size !== undefined) q.append('size', params.size.toString());
    if (params.sortBy) q.append('sortBy', params.sortBy);
    if (params.sortDir) q.append('sortDir', params.sortDir);
    return this.request<PageResponse<Device>>(`/devices?${q.toString()}`);
  };

  getDeviceById = (id: number): Promise<Device> =>
    this.request<Device>(`/devices/${id}`);

  createDevice = (dto: DeviceCreateUpdateDto): Promise<Device> =>
    this.request<Device>('/devices', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

  updateDevice = (id: number, dto: DeviceCreateUpdateDto): Promise<Device> =>
    this.request<Device>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });

  assignDeviceCustomer = (id: number, customerId?: number): Promise<Device> =>
    this.request<Device>(`/devices/${id}/customer`, {
      method: 'PUT',
      body: JSON.stringify({ customerId: customerId ?? null }),
    });

  deleteDevice = (id: number): Promise<void> =>
    this.request<void>(`/devices/${id}`, { method: 'DELETE' });

  exportDevicesCsv = (): Promise<Blob> =>
    this.requestBlob('/devices/export/csv');

  importDevicesCsv = (file: File): Promise<{ message: string; count: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ message: string; count: number }>('/devices/import/csv', {
      method: 'POST',
      body: formData,
    });
  };

  getDeviceMetrics = (deviceId: number, hours = 24): Promise<Metric[]> =>
    this.request<Metric[]>(`/monitoring/devices/${deviceId}/metrics?hours=${hours}`);

  getDeviceInterfaces = (deviceId: number): Promise<DeviceInterface[]> =>
    this.request<DeviceInterface[]>(`/ipam/devices/${deviceId}/interfaces`);

  getDeviceBackups = (deviceId: number): Promise<ConfigBackup[]> =>
    this.request<ConfigBackup[]>(`/configs/devices/${deviceId}`);

  triggerConfigBackup = (deviceId: number, type = 'RUNNING'): Promise<ConfigBackup> =>
    this.request<ConfigBackup>(`/configs/devices/${deviceId}/backup?type=${type}`, {
      method: 'POST',
    });

  compareConfigVersions = (deviceId: number, versionA: number, versionB: number): Promise<ConfigDiff> =>
    this.request<ConfigDiff>(`/configs/devices/${deviceId}/diff?versionA=${versionA}&versionB=${versionB}`);

  getTopologyGraph = (site?: string): Promise<TopologyGraph> => {
    const q = site && site !== 'ALL' ? `?site=${encodeURIComponent(site)}` : '';
    return this.request<TopologyGraph>(`/topology${q}`);
  };

  getAlerts = (params: {
    status?: string;
    severity?: string;
    deviceId?: number;
    search?: string;
    page?: number;
    size?: number;
  } = {}): Promise<PageResponse<Alert>> => {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.severity) q.append('severity', params.severity);
    if (params.deviceId) q.append('deviceId', params.deviceId.toString());
    if (params.search) q.append('search', params.search);
    if (params.page !== undefined) q.append('page', params.page.toString());
    if (params.size !== undefined) q.append('size', params.size.toString());
    return this.request<PageResponse<Alert>>(`/alerts?${q.toString()}`);
  };

  handleAlertAction = (dto: AlertActionDto): Promise<{ message: string }> =>
    this.request<{ message: string }>('/alerts/action', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

  getAlertRules = (): Promise<AlertRule[]> =>
    this.request<AlertRule[]>('/alerts/rules');

  updateAlertRule = (id: number, dto: AlertRule): Promise<AlertRule> =>
    this.request<AlertRule>(`/alerts/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });

  getAllVlans = (): Promise<Vlan[]> =>
    this.request<Vlan[]>('/ipam/vlans');

  createVlan = (dto: Partial<Vlan>): Promise<Vlan> =>
    this.request<Vlan>('/ipam/vlans', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

  getIpAddresses = (params: {
    search?: string;
    status?: string;
    subnet?: string;
    page?: number;
    size?: number;
  } = {}): Promise<PageResponse<IpAddressItem>> => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.subnet) q.append('subnet', params.subnet);
    if (params.page !== undefined) q.append('page', params.page.toString());
    if (params.size !== undefined) q.append('size', params.size.toString());
    return this.request<PageResponse<IpAddressItem>>(`/ipam/ips?${q.toString()}`);
  };

  allocateIp = (dto: Partial<IpAddressItem>): Promise<IpAddressItem> =>
    this.request<IpAddressItem>('/ipam/ips', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

  getReportSummary = (site?: string): Promise<ReportSummary> => {
    const q = site && site !== 'ALL' ? `?site=${encodeURIComponent(site)}` : '';
    return this.request<ReportSummary>(`/reports/summary${q}`);
  };

  exportReportCsv = (site?: string): Promise<Blob> => {
    const q = site && site !== 'ALL' ? `?site=${encodeURIComponent(site)}` : '';
    return this.requestBlob(`/reports/export/csv${q}`);
  };

  exportReportPdf = (site?: string): Promise<Blob> => {
    const q = site && site !== 'ALL' ? `?site=${encodeURIComponent(site)}` : '';
    return this.requestBlob(`/reports/export/pdf${q}`);
  };

  getAuditLogs = (params: {
    search?: string;
    action?: string;
    page?: number;
    size?: number;
  } = {}): Promise<PageResponse<AuditLogItem>> => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.action) q.append('action', params.action);
    if (params.page !== undefined) q.append('page', params.page.toString());
    if (params.size !== undefined) q.append('size', params.size.toString());
    return this.request<PageResponse<AuditLogItem>>(`/audit-logs?${q.toString()}`);
  };

  getNotificationSettings = (): Promise<NotificationSetting> =>
    this.request<NotificationSetting>('/settings/notifications');

  updateNotificationSettings = (dto: NotificationSetting): Promise<NotificationSetting> =>
    this.request<NotificationSetting>('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });

  testNotification = (): Promise<{ success: boolean; message: string }> =>
    this.request<{ success: boolean; message: string }>('/settings/notifications/test', {
      method: 'POST',
    });

  getSimulatorStatus = (): Promise<{ enabled: boolean; pollingIntervalMs: number; simulatedDeviceCount: number; mode: string }> =>
    this.request('/simulator/status');

  triggerSimulatorPoll = (): Promise<{ message: string }> =>
    this.request('/simulator/poll-now', { method: 'POST' });

  injectSimulatorStatus = (deviceId: number, status: string): Promise<{ deviceId: number; deviceName: string; newStatus: string }> =>
    this.request(`/simulator/inject-status?deviceId=${deviceId}&status=${status}`, {
      method: 'POST',
    });
}

export const api = new ApiClient();
export const apiClient = api;

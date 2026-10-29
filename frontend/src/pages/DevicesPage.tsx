import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Device, DeviceCreateUpdateDto } from '../types';
import { DataTable } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Download,
  Upload,
  Search,
  ArrowRight,
  Server,
  Network,
  Shield,
  Wifi,
  Radio,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasRole, isAdmin } = useAuth();

  const [page, setPage] = useState(0);
  const size = 15;
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState(searchParams.get('site') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Add Device Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get('new') === 'true');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const [newDevice, setNewDevice] = useState<DeviceCreateUpdateDto>({
    name: '',
    ipAddress: '',
    deviceType: 'ROUTER',
    vendor: 'Cisco',
    model: 'Catalyst 9300',
    site: 'HQ - New York',
    location: 'Rack B1',
    snmpVersion: 'v2c',
    snmpCommunity: 'public',
    snmpPort: 161,
  });

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['devices', search, siteFilter, typeFilter, statusFilter, page, size],
    queryFn: () =>
      apiClient.getDevices({
        search,
        site: siteFilter || undefined,
        deviceType: typeFilter || undefined,
        status: statusFilter || undefined,
        page,
        size,
      }),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customer-accounts'],
    queryFn: () => apiClient.auth.customers(),
    enabled: isAdmin && isAddModalOpen,
  });

  const createMutation = useMutation({
    mutationFn: (dto: DeviceCreateUpdateDto) => apiClient.createDevice(dto),
    onSuccess: (saved: Device) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setIsAddModalOpen(false);
      navigate(`/devices/${saved.id}`);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newDevice);
  };

  const handleExportCsv = async () => {
    try {
      const blob = await apiClient.exportDevicesCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cnip-devices.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    try {
      const res = await apiClient.importDevicesCsv(importFile);
      setImportMessage(`Import successful! Processed ${res.count} devices.`);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportMessage(null);
        setImportFile(null);
      }, 1500);
    } catch (err: any) {
      setImportMessage(`Import failed: ${err.message}`);
    }
  };

  const handleCopyIp = (ip: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

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

  const getTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ROUTER':
        return <Network className="w-4 h-4 text-indigo-500" />;
      case 'SWITCH':
        return <Server className="w-4 h-4 text-emerald-500" />;
      case 'FIREWALL':
        return <Shield className="w-4 h-4 text-amber-500" />;
      case 'ACCESS_POINT':
        return <Wifi className="w-4 h-4 text-blue-500" />;
      default:
        return <Radio className="w-4 h-4 text-purple-500" />;
    }
  };

  const columns: ColumnDef<Device>[] = [
    {
      accessorKey: 'name',
      header: 'Device Name & Architecture',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-center shadow-xs flex-shrink-0">
            {getTypeIcon(row.original.deviceType)}
          </div>
          <div>
            <div className="font-bold text-foreground flex items-center gap-1.5 hover:text-indigo-600 transition">
              <span>{row.original.name}</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {row.original.vendor} • {row.original.model}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'ipAddress',
      header: 'Management IP',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 group/ip">
          <span className="font-mono text-xs font-semibold text-foreground">{row.original.ipAddress}</span>
          <button
            onClick={(e) => handleCopyIp(row.original.ipAddress, e)}
            className="p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover/ip:opacity-100 transition"
            title="Copy IP"
          >
            {copiedIp === row.original.ipAddress ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'site',
      header: 'Site Location',
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-semibold text-foreground block">{row.original.site}</span>
          <span className="text-[11px] text-muted-foreground font-medium block">{row.original.location}</span>
        </div>
      ),
    },
    {
      accessorKey: 'deviceType',
      header: 'Class',
      cell: ({ row }) => (
        <span className="text-xs px-2.5 py-0.5 rounded-lg bg-muted/60 border border-border/50 font-semibold text-foreground">
          {row.original.deviceType}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Health Status',
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status)} dot>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'lastSeen',
      header: 'Last Telemetry',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-tabular">
          {row.original.lastSeen
            ? new Date(row.original.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'Pending'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/devices/${row.original.id}`);
            }}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="View Device Details"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'UP', label: 'UP (Online)' },
    { value: 'WARNING', label: 'WARNING (Degraded)' },
    { value: 'DOWN', label: 'DOWN (Offline)' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Device Inventory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground font-tabular">
              {pageData?.totalElements ?? 40} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage multi-vendor routers, switches, firewalls, and telemetry profiles
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition shadow-xs"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Export CSV</span>
          </button>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition shadow-xs"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md shadow-indigo-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>Add Device</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modern Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search hostname, management IP, vendor, model..."
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
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

        {/* Status Filter Tabs / Select */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={siteFilter}
            onChange={(e) => {
              setSiteFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            <option value="">All Sites</option>
            <option value="HQ - New York">HQ - New York</option>
            <option value="DC - Ashburn">DC - Ashburn</option>
            <option value="Branch - Frankfurt">Branch - Frankfurt</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            <option value="">All Types</option>
            <option value="ROUTER">Router</option>
            <option value="SWITCH">Switch</option>
            <option value="FIREWALL">Firewall</option>
            <option value="ACCESS_POINT">Access Point</option>
            <option value="SERVER">Server</option>
          </select>

          {(search || siteFilter || typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setSiteFilter('');
                setTypeFilter('');
                setStatusFilter('');
                setPage(0);
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* TanStack Table */}
      <DataTable
        columns={columns}
        data={pageData?.content || []}
        pageIndex={page}
        pageSize={size}
        pageCount={pageData?.totalPages || 1}
        onPageChange={setPage}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/devices/${row.id}`)}
        emptyMessage="No devices match the specified query and filters."
      />

      {/* Add Device Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Network Device"
        description="Register a new device into the CNIP telemetry polling engine"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Device Hostname / Name *
              </label>
              <input
                type="text"
                required
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                placeholder="nyc-core-rtr-02"
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Management IP Address *
              </label>
              <input
                type="text"
                required
                value={newDevice.ipAddress}
                onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                placeholder="10.10.1.15"
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Device Class *
              </label>
              <select
                value={newDevice.deviceType}
                onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ROUTER">Router</option>
                <option value="SWITCH">Switch</option>
                <option value="FIREWALL">Firewall</option>
                <option value="ACCESS_POINT">Access Point</option>
                <option value="SERVER">Server</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Site Location *
              </label>
              <select
                value={newDevice.site}
                onChange={(e) => setNewDevice({ ...newDevice, site: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="HQ - New York">HQ - New York</option>
                <option value="DC - Ashburn">DC - Ashburn</option>
                <option value="Branch - Frankfurt">Branch - Frankfurt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Hardware Vendor
              </label>
              <input
                type="text"
                value={newDevice.vendor}
                onChange={(e) => setNewDevice({ ...newDevice, vendor: e.target.value })}
                placeholder="Cisco"
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Model Architecture
              </label>
              <input
                type="text"
                value={newDevice.model}
                onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                placeholder="Catalyst 9300"
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Rack Location
              </label>
              <input
                type="text"
                value={newDevice.location}
                onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                placeholder="Rack B1"
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                SNMP Community
              </label>
              <input
                type="text"
                value={newDevice.snmpCommunity}
                onChange={(e) => setNewDevice({ ...newDevice, snmpCommunity: e.target.value })}
                placeholder="public"
                className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {isAdmin && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                  Assign to Customer
                </label>
                <select
                  value={newDevice.customerId ?? ''}
                  onChange={(e) =>
                    setNewDevice({
                      ...newDevice,
                      customerId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned (Internal Only)</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.username} · {c.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border/80 hover:bg-muted text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Provisioning...' : 'Create Device'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportMessage(null);
        }}
        title="Import Devices from CSV"
        description="Bulk upload network inventory in RFC 4180 CSV format"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="p-6 border-2 border-dashed border-border/80 rounded-2xl text-center space-y-2 bg-muted/20">
            <Upload className="w-8 h-8 text-indigo-500 mx-auto stroke-1" />
            <p className="text-xs font-semibold text-foreground">Select a .csv inventory file</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-border file:text-xs file:font-semibold file:bg-card file:text-foreground hover:file:bg-muted cursor-pointer"
            />
          </div>

          {importMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                importMessage.includes('failed')
                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              }`}
            >
              {importMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border/80 hover:bg-muted text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!importFile}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
            >
              Start Import
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

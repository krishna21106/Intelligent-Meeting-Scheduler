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

  // Add Device Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  const columns: ColumnDef<Device>[] = [
    {
      accessorKey: 'name',
      header: 'Device Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {row.original.deviceType.substring(0, 2)}
          </div>
          <div>
            <div className="font-semibold text-foreground flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              <span>{row.original.name}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{row.original.vendor} • {row.original.model}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'ipAddress',
      header: 'Management IP',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.ipAddress}</span>,
    },
    {
      accessorKey: 'site',
      header: 'Site & Location',
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-medium text-foreground block">{row.original.site}</span>
          <span className="text-[11px] text-muted-foreground block">{row.original.location}</span>
        </div>
      ),
    },
    {
      accessorKey: 'deviceType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-medium text-foreground">
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
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="View Device Details"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Device Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage routers, switches, firewalls, and server endpoints
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border bg-card hover:bg-muted text-foreground transition shadow-sm"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Export CSV</span>
          </button>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border bg-card hover:bg-muted text-foreground transition shadow-sm"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span>Import</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Add Device</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card p-3 rounded-xl border shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, IP, model..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Sites</option>
          <option value="HQ - New York">HQ - New York</option>
          <option value="DC - Ashburn">DC - Ashburn</option>
          <option value="Branch - Frankfurt">Branch - Frankfurt</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          <option value="ROUTER">Router</option>
          <option value="SWITCH">Switch</option>
          <option value="FIREWALL">Firewall</option>
          <option value="ACCESS_POINT">Access Point</option>
          <option value="SERVER">Server</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="UP">UP (Nominal)</option>
          <option value="WARNING">WARNING (Degraded)</option>
          <option value="DOWN">DOWN (Offline)</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
        </select>
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
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Device Hostname / Name *
              </label>
              <input
                type="text"
                required
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                placeholder="nyc-core-rtr-02"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Management IP Address *
              </label>
              <input
                type="text"
                required
                value={newDevice.ipAddress}
                onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                placeholder="10.10.1.15"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Device Type *
              </label>
              <select
                value={newDevice.deviceType}
                onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ROUTER">Router</option>
                <option value="SWITCH">Switch</option>
                <option value="FIREWALL">Firewall</option>
                <option value="ACCESS_POINT">Access Point</option>
                <option value="SERVER">Server</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Site Location *
              </label>
              <select
                value={newDevice.site}
                onChange={(e) => setNewDevice({ ...newDevice, site: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="HQ - New York">HQ - New York</option>
                <option value="DC - Ashburn">DC - Ashburn</option>
                <option value="Branch - Frankfurt">Branch - Frankfurt</option>
              </select>
            </div>

            {isAdmin && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Assign to customer
                </label>
                <select
                  value={newDevice.customerId ?? ''}
                  onChange={(e) => setNewDevice({
                    ...newDevice,
                    customerId: e.target.value ? Number(e.target.value) : undefined,
                  })}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.username} · {customer.email}</option>)}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Only this customer will see the device and its alerts in their portal.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Vendor
              </label>
              <input
                type="text"
                value={newDevice.vendor}
                onChange={(e) => setNewDevice({ ...newDevice, vendor: e.target.value })}
                placeholder="Cisco / Arista / Juniper"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Model
              </label>
              <input
                type="text"
                value={newDevice.model}
                onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                placeholder="Catalyst 9300"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                SNMP Community
              </label>
              <input
                type="text"
                value={newDevice.snmpCommunity}
                onChange={(e) => setNewDevice({ ...newDevice, snmpCommunity: e.target.value })}
                placeholder="public"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                SNMP Port
              </label>
              <input
                type="number"
                value={newDevice.snmpPort}
                onChange={(e) => setNewDevice({ ...newDevice, snmpPort: parseInt(e.target.value) || 161 })}
                placeholder="161"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-muted transition text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Device'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Devices via CSV"
        description="Upload a CSV file with columns: name,ipAddress,deviceType,vendor,model,site,location"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="p-6 border-2 border-dashed rounded-xl border-border flex flex-col items-center justify-center text-center">
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Select CSV device list</p>
            <p className="text-xs text-muted-foreground mt-1">Supports standard RFC CSV schema</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
              className="mt-4 text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-100"
            />
          </div>

          {importMessage && (
            <div className="text-xs p-3 rounded-lg bg-muted text-foreground font-medium">
              {importMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-muted transition text-foreground"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!importFile}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
            >
              Upload & Import
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

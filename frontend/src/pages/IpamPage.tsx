import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Vlan, IpAddressItem } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { DataTable } from '../components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const IpamPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'vlans' | 'ips'>('vlans');
  const [ipPage, setIpPage] = useState(0);
  const [ipSearch, setIpSearch] = useState('');
  const [ipStatusFilter, setIpStatusFilter] = useState('');

  // Modals
  const [isVlanModalOpen, setIsVlanModalOpen] = useState(false);
  const [isAllocateIpModalOpen, setIsAllocateIpModalOpen] = useState(false);

  const [newVlan, setNewVlan] = useState({
    vlanId: 50,
    name: 'SEC-ISOLATED',
    subnet: '10.50.0.0/24',
    description: 'Security & quarantined devices subnet',
  });

  const [newIp, setNewIp] = useState({
    ipAddress: '10.10.1.55',
    subnet: '10.10.1.0/24',
    status: 'RESERVED' as const,
    dnsName: 'nyc-gw-reserve.cnip.internal',
  });

  // Queries
  const { data: vlans } = useQuery({
    queryKey: ['vlans'],
    queryFn: () => apiClient.getAllVlans(),
  });

  const { data: ipData, isLoading: ipLoading } = useQuery({
    queryKey: ['ips', ipPage, ipSearch, ipStatusFilter],
    queryFn: () =>
      apiClient.getIpAddresses({
        page: ipPage,
        size: 20,
        search: ipSearch || undefined,
        status: ipStatusFilter || undefined,
      }),
    enabled: activeTab === 'ips',
  });

  // Mutations
  const createVlanMutation = useMutation({
    mutationFn: (dto: typeof newVlan) => apiClient.createVlan(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlans'] });
      setIsVlanModalOpen(false);
    },
  });

  const allocateIpMutation = useMutation({
    mutationFn: (dto: typeof newIp) => apiClient.allocateIp(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips'] });
      setIsAllocateIpModalOpen(false);
    },
  });

  const ipColumns: ColumnDef<IpAddressItem>[] = [
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => <span className="font-mono font-semibold text-xs text-foreground">{row.original.ipAddress}</span>,
    },
    {
      accessorKey: 'subnet',
      header: 'Subnet CIDR',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.subnet}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Allocation Status',
      cell: ({ row }) => {
        const variant =
          row.original.status === 'ALLOCATED' ? 'up' : row.original.status === 'RESERVED' ? 'warning' : 'secondary';
        return <Badge variant={variant} dot>{row.original.status}</Badge>;
      },
    },
    {
      accessorKey: 'deviceName',
      header: 'Assigned Device',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">
          {row.original.deviceName || '— (Unbound)'}
        </span>
      ),
    },
    {
      accessorKey: 'vlanNumber',
      header: 'VLAN',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono">
          VLAN {row.original.vlanNumber}
        </span>
      ),
    },
    {
      accessorKey: 'dnsName',
      header: 'DNS Hostname',
      cell: ({ row }) => <span className="text-xs text-muted-foreground font-mono">{row.original.dnsName || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">IPAM & VLAN Architecture</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            IP address plan, subnet allocations, and IEEE 802.1Q VLAN segments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasRole('ADMIN') && (
            <>
              {activeTab === 'vlans' ? (
                <button
                  onClick={() => setIsVlanModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create VLAN</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsAllocateIpModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Reserve IP</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('vlans')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'vlans'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Configured VLANs ({vlans?.length || 0})
          {activeTab === 'vlans' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ips')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'ips'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          IP Address Registry
          {activeTab === 'ips' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: VLANS */}
      {activeTab === 'vlans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vlans?.map((v: Vlan) => {
            const pct = Math.round((v.allocatedIpCount / v.totalIpCapacity) * 100);
            return (
              <div key={v.id} className="bg-card rounded-xl border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                      {v.vlanId}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{v.name}</h3>
                      <span className="font-mono text-xs text-muted-foreground">{v.subnet}</span>
                    </div>
                  </div>
                  <Badge variant="info">802.1Q</Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{v.description}</p>

                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pool Utilization</span>
                    <span className="font-semibold text-foreground font-tabular">
                      {v.allocatedIpCount} / {v.totalIpCapacity} IPs ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: IP REGISTRY */}
      {activeTab === 'ips' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={ipSearch}
                onChange={(e) => setIpSearch(e.target.value)}
                placeholder="Search IP address or hostname..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={ipStatusFilter}
              onChange={(e) => setIpStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="RESERVED">Reserved</option>
              <option value="AVAILABLE">Available</option>
            </select>
          </div>

          <DataTable
            columns={ipColumns}
            data={ipData?.content || []}
            pageIndex={ipPage}
            pageSize={20}
            pageCount={ipData?.totalPages || 1}
            onPageChange={setIpPage}
            isLoading={ipLoading}
            emptyMessage="No IP address allocations match the query."
          />
        </div>
      )}

      {/* Create VLAN Modal */}
      <Modal
        isOpen={isVlanModalOpen}
        onClose={() => setIsVlanModalOpen(false)}
        title="Create New VLAN"
        description="Provision a new IEEE 802.1Q virtual LAN tag and subnet mask"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createVlanMutation.mutate(newVlan);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                VLAN Tag (ID) *
              </label>
              <input
                type="number"
                required
                value={newVlan.vlanId}
                onChange={(e) => setNewVlan({ ...newVlan, vlanId: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                VLAN Name *
              </label>
              <input
                type="text"
                required
                value={newVlan.name}
                onChange={(e) => setNewVlan({ ...newVlan, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
              Subnet CIDR *
            </label>
            <input
              type="text"
              required
              value={newVlan.subnet}
              onChange={(e) => setNewVlan({ ...newVlan, subnet: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={newVlan.description}
              onChange={(e) => setNewVlan({ ...newVlan, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsVlanModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-muted text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createVlanMutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
            >
              {createVlanMutation.isPending ? 'Saving...' : 'Create VLAN'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reserve IP Modal */}
      <Modal
        isOpen={isAllocateIpModalOpen}
        onClose={() => setIsAllocateIpModalOpen(false)}
        title="Reserve IP Address"
        description="Allocate or reserve a static IP from a managed subnet pool"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            allocateIpMutation.mutate(newIp);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
              IP Address *
            </label>
            <input
              type="text"
              required
              value={newIp.ipAddress}
              onChange={(e) => setNewIp({ ...newIp, ipAddress: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
              Subnet CIDR *
            </label>
            <input
              type="text"
              required
              value={newIp.subnet}
              onChange={(e) => setNewIp({ ...newIp, subnet: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
              DNS Hostname
            </label>
            <input
              type="text"
              value={newIp.dnsName}
              onChange={(e) => setNewIp({ ...newIp, dnsName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsAllocateIpModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-muted text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={allocateIpMutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
            >
              {allocateIpMutation.isPending ? 'Saving...' : 'Reserve IP'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

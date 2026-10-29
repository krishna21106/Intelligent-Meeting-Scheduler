import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { AuditLogItem } from '../types';
import { DataTable } from '../components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const size = 20;
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['auditLogs', page, size, search, actionFilter],
    queryFn: () =>
      apiClient.getAuditLogs({
        page,
        size,
        search: search || undefined,
        action: actionFilter || undefined,
      }),
  });

  const columns: ColumnDef<AuditLogItem>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Timestamp',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-tabular">
          {new Date(row.original.createdAt || row.original.timestamp || '').toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'username',
      header: 'Operator / Principal',
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground font-mono">
          {row.original.username}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action Taken',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-mono font-medium text-foreground">
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Target Entity',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.entityType} #{row.original.entityId}
        </span>
      ),
    },
    {
      accessorKey: 'details',
      header: 'Audit Trail Details',
      cell: ({ row }) => (
        <span className="text-xs text-foreground line-clamp-1">
          {row.original.details}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immutable ledger of operator modifications, rule edits, and system actions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by username or details..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="CREATE_DEVICE">CREATE_DEVICE</option>
          <option value="UPDATE_DEVICE">UPDATE_DEVICE</option>
          <option value="DELETE_DEVICE">DELETE_DEVICE</option>
          <option value="ACKNOWLEDGE_ALERT">ACKNOWLEDGE_ALERT</option>
          <option value="RESOLVE_ALERT">RESOLVE_ALERT</option>
          <option value="TRIGGER_BACKUP">TRIGGER_BACKUP</option>
          <option value="CREATE_VLAN">CREATE_VLAN</option>
        </select>
      </div>

      {/* Audit DataTable */}
      <DataTable
        columns={columns}
        data={auditData?.content || []}
        pageIndex={page}
        pageSize={size}
        pageCount={auditData?.totalPages || 1}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No audit log entries found matching criteria."
      />
    </div>
  );
};

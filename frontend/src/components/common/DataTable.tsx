import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Inbox, ArrowUp, ArrowDown } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageIndex = 0,
  pageSize: _pageSize = 15,
  pageCount = 1,
  onPageChange,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-[11px] uppercase tracking-wider bg-muted/50 backdrop-blur-md text-muted-foreground border-b border-border/80 select-none">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  return (
                    <th key={header.id} className="px-5 py-3.5 font-bold">
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'flex items-center gap-1.5 cursor-pointer hover:text-foreground transition group'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-muted-foreground/50 group-hover:text-foreground transition">
                              {isSorted === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
                              ) : isSorted === 'desc' ? (
                                <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-5 py-4">
                      <div className="h-4 bg-muted/60 rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={`group hover:bg-muted/30 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5 text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 mb-3">
                      <Inbox className="w-8 h-8 stroke-1 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{emptyMessage}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your filters or search keywords</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {onPageChange && pageCount > 1 && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/80 bg-muted/20">
          <div className="text-xs text-muted-foreground">
            Showing Page <span className="font-bold text-foreground">{pageIndex + 1}</span> of{' '}
            <span className="font-bold text-foreground">{pageCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pageIndex - 1)}
              disabled={pageIndex <= 0}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition shadow-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={pageIndex >= pageCount - 1}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition shadow-xs flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

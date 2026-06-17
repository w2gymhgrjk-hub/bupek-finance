'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { branchesApi } from '@/lib/api';
import { Branch, PaginationMeta } from '@/types';

export default function BranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await branchesApi.list({ search, page, limit: 20 });
      setBranches(res.data.data);
      setMeta(res.data.meta);
    } catch {}
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'branchCode', label: 'Code', render: (b: Branch) => <span className="font-mono text-xs text-blue-600">{b.branchCode}</span> },
    { key: 'name', label: 'Branch Name' },
    { key: 'region', label: 'Region' },
    { key: 'manager', label: 'Manager', render: (b: Branch) => b.manager ? `${b.manager.firstName} ${b.manager.lastName}` : '—' },
    { key: 'clients', label: 'Clients', render: (b: Branch) => b._count?.clients ?? '—' },
    { key: 'loans', label: 'Active Loans', render: (b: Branch) => b._count?.loans ?? '—' },
    { key: 'status', label: 'Status', render: (b: Branch) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Branches" subtitle="Manage branch network" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="page-header">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9 w-64" placeholder="Search branches…" />
          </div>
          <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER']}>
            <button onClick={() => router.push('/branches/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </PermissionGuard>
        </div>

        <DataTable columns={columns as never[]} data={branches as never[]} loading={loading} meta={meta}
          onPageChange={setPage} onRowClick={(b) => router.push(`/branches/${(b as Branch).id}`)} />
      </div>
    </div>
  );
}
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { clientsApi, branchesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Client, Branch, PaginationMeta } from '@/types';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientsApi.list({ search, branchId, status, page, limit: 20 });
      setClients(res.data.data);
      setMeta(res.data.meta);
    } catch {}
    setLoading(false);
  }, [search, branchId, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const columns = [
    { key: 'clientNo', label: 'Client No', render: (c: Client) => <span className="font-mono text-xs text-blue-600">{c.clientNo}</span> },
    { key: 'name', label: 'Full Name', render: (c: Client) => `${c.firstName} ${c.lastName}` },
    { key: 'nationalId', label: 'National ID' },
    { key: 'phonePrimary', label: 'Phone' },
    { key: 'branch', label: 'Branch', render: (c: Client) => c.branch?.name || '—' },
    { key: 'loanOfficer', label: 'Loan Officer', render: (c: Client) => c.loanOfficer ? `${c.loanOfficer.firstName} ${c.loanOfficer.lastName}` : '—' },
    { key: 'status', label: 'Status', render: (c: Client) => <StatusBadge status={c.status} /> },
    { key: 'createdAt', label: 'Registered', render: (c: Client) => formatDate(c.createdAt) },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Clients" subtitle="Manage borrower records" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9 w-64" placeholder="Name, phone, national ID…" />
            </div>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-36">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="BLACKLISTED">Blacklisted</option>
            </select>
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <PermissionGuard check={r => !['ACCOUNTANT'].includes(r)}>
            <button onClick={() => router.push('/clients/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Client
            </button>
          </PermissionGuard>
        </div>

        <DataTable columns={columns as never[]} data={clients as never[]} loading={loading} meta={meta}
          onPageChange={setPage} onRowClick={(c) => router.push(`/clients/${(c as Client).id}`)} />
      </div>
    </div>
  );
}
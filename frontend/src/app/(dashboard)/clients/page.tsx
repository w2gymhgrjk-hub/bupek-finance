'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Pencil, UserCheck, UserX } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { clientsApi, branchesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Client, Branch, PaginationMeta } from '@/types';
import toast from 'react-hot-toast';

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
    } catch {
      toast.error('Failed to load clients');
    }
    setLoading(false);
  }, [search, branchId, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {});
  }, []);

  async function handleStatusChange(client: Client, newStatus: string) {
    try {
      await clientsApi.updateStatus(client.id, newStatus);
      toast.success(`Client ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      load();
    } catch {
      toast.error('Failed to update status');
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Clients" subtitle="Manage borrower records" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── Toolbar ── */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="input pl-9 w-60 py-2"
                  placeholder="Name, phone, national ID…"
                />
              </div>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-36 py-2">
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
              <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="input w-44 py-2">
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
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Clients',  value: meta?.total ?? clients.length,                              color: 'bg-blue-500'    },
            { label: 'Active',         value: clients.filter(c => c.status === 'ACTIVE').length,          color: 'bg-emerald-500' },
            { label: 'Inactive',       value: clients.filter(c => c.status === 'INACTIVE').length,        color: 'bg-amber-500'   },
            { label: 'Blacklisted',    value: clients.filter(c => c.status === 'BLACKLISTED').length,     color: 'bg-red-500'     },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white font-bold text-sm`}>
                {s.value}
              </div>
              <p className="text-sm font-medium text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Client Records</h3>
            <span className="text-sm text-gray-500">{meta?.total ?? clients.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner-lg" />
            </div>
          ) : clients.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No clients found</p>
              <p className="empty-message">Register your first client to get started</p>
              <button onClick={() => router.push('/clients/new')} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Add Client
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client No</th>
                    <th>Full Name</th>
                    <th>National ID</th>
                    <th>Phone</th>
                    <th>Branch</th>
                    <th>Loan Officer</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {c.clientNo}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <span className="font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-gray-600">{c.nationalId || '—'}</td>
                      <td>{c.phonePrimary}</td>
                      <td>{(c as any).branch?.name ?? <span className="text-gray-400">—</span>}</td>
                      <td>
                        {(c as any).loanOfficer
                          ? `${(c as any).loanOfficer.firstName} ${(c as any).loanOfficer.lastName}`
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="text-gray-500 text-xs">{formatDate(c.createdAt)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <button
                            onClick={() => router.push(`/clients/${c.id}`)}
                            title="View details"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Edit */}
                          <PermissionGuard check={r => !['ACCOUNTANT'].includes(r)}>
                            <button
                              onClick={() => router.push(`/clients/${c.id}/edit`)}
                              title="Edit client"
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          {/* Activate / Deactivate */}
                          <PermissionGuard check={r => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'].includes(r)}>
                            {c.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleStatusChange(c, 'INACTIVE')}
                                title="Deactivate client"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(c, 'ACTIVE')}
                                title="Activate client"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {meta.page} of {meta.totalPages} — {meta.total} clients
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >‹</button>
                {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setPage(p)}
                  >{p}</button>
                ))}
                <button
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Pencil, Building2, Users, BadgeDollarSign } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { branchesApi } from '@/lib/api';
import { Branch, PaginationMeta } from '@/types';
import toast from 'react-hot-toast';

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
    } catch {
      toast.error('Failed to load branches');
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const totalClients = branches.reduce((s, b) => s + (b._count?.clients ?? 0), 0);
  const totalLoans   = branches.reduce((s, b) => s + (b._count?.loans   ?? 0), 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Branches" subtitle="Manage branch network" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── Toolbar ── */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9 w-64 py-2"
                placeholder="Search branches…"
              />
            </div>
            <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER']}>
              <button onClick={() => router.push('/branches/new')} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Branch
              </button>
            </PermissionGuard>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Branches', value: meta?.total ?? branches.length, color: 'bg-blue-500',    icon: Building2 },
            { label: 'Total Clients',  value: totalClients,                    color: 'bg-emerald-500', icon: Users },
            { label: 'Active Loans',   value: totalLoans,                      color: 'bg-amber-500',   icon: BadgeDollarSign },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white flex-shrink-0`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Branch Network</h3>
            <span className="text-sm text-gray-500">{meta?.total ?? branches.length} branches</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner-lg" />
            </div>
          ) : branches.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No branches found</p>
              <p className="empty-message">Create your first branch to get started</p>
              <button onClick={() => router.push('/branches/new')} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Add Branch
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Branch Name</th>
                    <th>Region</th>
                    <th>District</th>
                    <th>Manager</th>
                    <th className="text-center">Clients</th>
                    <th className="text-center">Loans</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id}>
                      <td>
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {b.branchCode}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">{b.name}</span>
                        </div>
                      </td>
                      <td className="text-gray-600">{b.region || '—'}</td>
                      <td className="text-gray-600">{b.district || '—'}</td>
                      <td>
                        {b.manager
                          ? <span className="font-medium text-gray-800">{b.manager.firstName} {b.manager.lastName}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">
                          {b._count?.clients ?? 0}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">
                          {b._count?.loans ?? 0}
                        </span>
                      </td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/branches/${b.id}`)}
                            title="View branch"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER']}>
                            <button
                              onClick={() => router.push(`/branches/${b.id}/edit`)}
                              title="Edit branch"
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
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
                Page {meta.page} of {meta.totalPages} — {meta.total} branches
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

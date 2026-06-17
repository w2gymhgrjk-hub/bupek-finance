'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, ShieldCheck, RefreshCw } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { PaginationMeta } from '@/types';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  action: string;
  module: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string; role: string };
}

const MODULE_COLORS: Record<string, string> = {
  auth:        'bg-blue-50 text-blue-700',
  users:       'bg-purple-50 text-purple-700',
  clients:     'bg-teal-50 text-teal-700',
  loans:       'bg-green-50 text-green-700',
  repayments:  'bg-emerald-50 text-emerald-700',
  collections: 'bg-orange-50 text-orange-700',
  sms:         'bg-pink-50 text-pink-700',
  branches:    'bg-cyan-50 text-cyan-700',
};

const ACTION_COLOR = (action: string) => {
  if (action.startsWith('CREATE')) return 'text-emerald-600';
  if (action.startsWith('UPDATE') || action.startsWith('CHANGE')) return 'text-blue-600';
  if (action.startsWith('DELETE') || action.startsWith('REJECT')) return 'text-red-600';
  if (action.startsWith('LOGIN')) return 'text-purple-600';
  if (action.startsWith('APPROVE') || action.startsWith('DISBURSE')) return 'text-green-600';
  return 'text-gray-700';
};

export default function AuditPage() {
  const [logs,  setLogs]  = useState<AuditLog[]>([]);
  const [meta,  setMeta]  = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [module, setModule]   = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 30 };
      if (search)    params.action    = search;
      if (module)    params.module    = module;
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const res = await api.get('/audit', { params });
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch { toast.error('Failed to load audit trail'); }
    setLoading(false);
  }, [search, module, startDate, endDate, page]);

  useEffect(() => { load(); }, [load]);

  const MODULES = ['auth', 'users', 'clients', 'loans', 'repayments', 'collections', 'sms', 'branches'];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Audit Trail" subtitle="Full system activity log" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9 py-2 w-full" placeholder="Search by action…" />
            </div>
            <select value={module} onChange={e => { setModule(e.target.value); setPage(1); }} className="input w-40 py-2">
              <option value="">All Modules</option>
              {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="input py-2" />
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="input py-2" />
            <button onClick={load} className="btn-ghost" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stat */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          {meta?.total ?? logs.length} audit entries found
        </div>

        {/* Log table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="spinner-lg" /></div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No audit entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>User</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td>
                        {log.user ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.user.firstName} {log.user.lastName}</p>
                            <p className="text-xs text-gray-400">{log.user.role?.replace(/_/g,' ')}</p>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td>
                        <span className={`badge text-xs ${MODULE_COLORS[log.module] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.module}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs font-semibold ${ACTION_COLOR(log.action)}`}>
                          {log.action.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500 max-w-xs truncate">{log.description || '—'}</td>
                      <td className="text-xs text-gray-400 font-mono">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} · {meta.total} entries</p>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
                  disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
                  disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

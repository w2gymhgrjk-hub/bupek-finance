'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { usersApi, branchesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { User, Branch, PaginationMeta } from '@/types';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [branchId, setBranchId] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ search, role, branchId, page, limit: 20 });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {}
    setLoading(false);
  }, [search, role, branchId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const columns = [
    { key: 'userNo', label: 'User No', render: (u: User) => <span className="font-mono text-xs text-blue-600">{u.userNo}</span> },
    { key: 'name', label: 'Name', render: (u: User) => `${u.firstName} ${u.lastName}` },
    { key: 'role', label: 'Role', render: (u: User) => <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span> },
    { key: 'email', label: 'Email' },
    { key: 'branch', label: 'Branch', render: (u: User) => u.branch?.name || '—' },
    { key: 'status', label: 'Status', render: (u: User) => <StatusBadge status={u.status} /> },
    { key: 'lastLoginAt', label: 'Last Login', render: (u: User) => formatDate(u.lastLoginAt) },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Users" subtitle="Manage system users and roles" />
      <div className="flex-1 overflow-y-auto p-6">

        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9 w-64" placeholder="Search name or email…" />
            </div>
            <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All Roles</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER']}>
            <button onClick={() => router.push('/users/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </PermissionGuard>
        </div>

        <DataTable columns={columns as never[]} data={users as never[]} loading={loading} meta={meta}
          onPageChange={setPage} onRowClick={(u) => router.push(`/users/${(u as User).id}`)} />
      </div>
    </div>
  );
}
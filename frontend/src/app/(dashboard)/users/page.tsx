'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Edit2, UserCheck, UserX, Users, Shield, UserCog } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PermissionGuard from '@/components/shared/PermissionGuard';
import Modal from '@/components/shared/Modal';
import { usersApi, branchesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { User, Branch, PaginationMeta } from '@/types';
import { ROLE_LABELS, ROLE_COLORS, PERMISSIONS } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const ROLES = ['CEO_ADMIN','OPERATIONS_MANAGER','BRANCH_MANAGER','LOAN_OFFICER','COLLECTION_OFFICER','ACCOUNTANT'];

export default function UsersPage() {
  const router = useRouter();
  const { user: me } = useAuthStore();
  const [users, setUsers]       = useState<User[]>([]);
  const [meta, setMeta]         = useState<PaginationMeta | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [role, setRole]         = useState('');
  const [branchId, setBranchId] = useState('');
  const [page, setPage]         = useState(1);
  const [statusModal, setStatusModal] = useState<{ user: User; action: 'ACTIVE' | 'INACTIVE' } | null>(null);
  const [acting, setActing]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ search, role, branchId, page, limit: 20 });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [search, role, branchId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const handleStatusToggle = async () => {
    if (!statusModal) return;
    setActing(true);
    try {
      await usersApi.updateStatus(statusModal.user.id, statusModal.action);
      toast.success(`User ${statusModal.action === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
      setStatusModal(null);
      load();
    } catch { toast.error('Failed to update user status'); }
    setActing(false);
  };

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCount   = users.filter(u => u.status === 'ACTIVE').length;
  const inactiveCount = users.filter(u => u.status !== 'ACTIVE').length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Users & Staff" subtitle="Manage system users, roles and access" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff',  value: meta?.total ?? users.length, color: 'bg-blue-500',    icon: Users },
            { label: 'Active',       value: activeCount,                  color: 'bg-emerald-500', icon: UserCheck },
            { label: 'Inactive',     value: inactiveCount,                color: 'bg-gray-400',   icon: UserX },
            { label: 'Roles',        value: ROLES.length,                 color: 'bg-purple-500', icon: Shield },
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

        {/* ── Toolbar ── */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="input pl-9 w-56 py-2" placeholder="Name, email, user no…" />
              </div>
              <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="input w-44 py-2">
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>)}
              </select>
              <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="input w-44 py-2">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <PermissionGuard check={r => PERMISSIONS.canCreateUsers(r)}>
              <button onClick={() => router.push('/users/new')} className="btn-primary">
                <Plus className="w-4 h-4" /> Add User
              </button>
            </PermissionGuard>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Staff Directory</h3>
            <span className="text-sm text-gray-500">{meta?.total ?? users.length} users</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="spinner-lg" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="empty-title">No users found</p>
              <p className="empty-message">Add your first staff member to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User No</th>
                    <th>Staff Member</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Contact</th>
                    <th>Last Login</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <span className="font-mono text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          {u.userNo}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                      </td>
                      <td className="text-gray-600 text-sm">{u.branch?.name || <span className="text-gray-400 italic">HQ / All Branches</span>}</td>
                      <td className="text-sm text-gray-500">{u.phone || '—'}</td>
                      <td className="text-sm text-gray-400">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                      <td>
                        <span className={`badge ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <button onClick={() => router.push(`/users/${u.id}`)} title="View user"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Edit — only for managers, can't edit self's role */}
                          <PermissionGuard check={r => PERMISSIONS.canManageUsers(r)}>
                            <button onClick={() => router.push(`/users/${u.id}/edit`)} title="Edit user"
                              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          {/* Activate / Deactivate */}
                          <PermissionGuard check={r => PERMISSIONS.canManageUsers(r)}>
                            {me?.id !== u.id && (
                              u.status === 'ACTIVE' ? (
                                <button onClick={() => setStatusModal({ user: u, action: 'INACTIVE' })}
                                  title="Deactivate user"
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                                  <UserX className="w-4 h-4" />
                                </button>
                              ) : (
                                <button onClick={() => setStatusModal({ user: u, action: 'ACTIVE' })}
                                  title="Activate user"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )
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
              <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} — {meta.total} users</p>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
                  disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
                  disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Role Breakdown Card ── */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-purple-500" /> Staff by Role
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ROLES.map(r => (
              <div key={r} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className={`badge ${ROLE_COLORS[r as keyof typeof ROLE_COLORS]} text-xs`}>
                  {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                </span>
                <span className="font-bold text-gray-700">{roleCounts[r] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status Confirmation Modal ── */}
      {statusModal && (
        <Modal
          open
          onClose={() => setStatusModal(null)}
          title={statusModal.action === 'ACTIVE' ? 'Activate User' : 'Deactivate User'}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStatusModal(null)} className="btn-secondary" disabled={acting}>Cancel</button>
              <button onClick={handleStatusToggle} disabled={acting}
                className={statusModal.action === 'ACTIVE' ? 'btn-primary' : 'btn-danger'}>
                {acting ? 'Processing…' : statusModal.action === 'ACTIVE' ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                {statusModal.user.firstName?.[0]}{statusModal.user.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{statusModal.user.firstName} {statusModal.user.lastName}</p>
                <p className="text-sm text-gray-500">{ROLE_LABELS[statusModal.user.role]} · {statusModal.user.branch?.name || 'HQ'}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {statusModal.action === 'ACTIVE'
                ? 'This user will be able to log in and access the system again.'
                : 'This user will no longer be able to log in or access the system.'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

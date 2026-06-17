'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, ShieldAlert } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import Modal from '@/components/shared/Modal';
import { usersApi } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { User } from '@/types';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    Promise.all([usersApi.getById(id), usersApi.getActivity(id)])
      .then(([u, a]) => { setUser(u.data.data); setActivity(a.data.data || []); })
      .catch(() => router.push('/users'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleStatusChange = async () => {
    if (!newStatus) return;
    try {
      await usersApi.updateStatus(id, newStatus);
      toast.success('Status updated');
      setUser(u => u ? { ...u, status: newStatus as User['status'] } : null);
      setStatusModal(false);
    } catch { toast.error('Failed to update status'); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={`${user.firstName} ${user.lastName}`} subtitle={user.userNo} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="ml-auto flex gap-2">
            <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER']}>
              <button onClick={() => router.push(`/users/${id}/edit`)} className="btn-secondary">
                <Edit className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => { setNewStatus(user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); setStatusModal(true); }} className="btn-secondary">
                <ShieldAlert className="w-4 h-4" /> Change Status
              </button>
            </PermissionGuard>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="section-title">Profile</h3>
              <dl className="grid grid-cols-2 gap-4">
                {[
                  ['User No', user.userNo],
                  ['Full Name', `${user.firstName} ${user.lastName}`],
                  ['Email', user.email],
                  ['Phone', user.phone],
                  ['Role', <span className={`badge ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>],
                  ['Branch', user.branch?.name || '—'],
                  ['Status', <StatusBadge status={user.status} />],
                  ['Created', formatDate(user.createdAt)],
                  ['Last Login', formatDateTime(user.lastLoginAt)],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-xs text-gray-500 mb-0.5">{k}</dt>
                    <dd className="text-sm font-medium text-gray-900">{v as React.ReactNode}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="card p-6">
              <h3 className="section-title">Recent Activity</h3>
              {(activity as Array<{ action: string; module: string; createdAt: string; ipAddress: string }>).length === 0
                ? <p className="text-sm text-gray-400">No activity recorded.</p>
                : <div className="space-y-2">
                  {(activity as Array<{ action: string; module: string; createdAt: string; ipAddress: string }>).slice(0, 20).map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700">{a.action} <span className="text-gray-400">in</span> {a.module}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{a.ipAddress}</span>
                        <span>{formatDateTime(a.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          </div>
        </div>

        <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Change User Status"
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStatusModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleStatusChange} className="btn-primary">Confirm</button>
            </div>
          }>
          <p className="text-sm text-gray-700">Set status to <strong>{newStatus}</strong> for <strong>{user.firstName} {user.lastName}</strong>?</p>
        </Modal>
      </div>
    </div>
  );
}
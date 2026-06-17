'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Users, CreditCard } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import DataTable from '@/components/shared/DataTable';
import { branchesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Branch, User } from '@/types';
import { ROLE_LABELS } from '@/lib/permissions';

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [perf, setPerf] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      branchesApi.getById(id),
      branchesApi.getStaff(id),
      branchesApi.getPerformance(id),
    ]).then(([b, s, p]) => {
      setBranch(b.data.data);
      setStaff(s.data.data || []);
      setPerf(p.data.data);
    }).catch(() => router.push('/branches'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>;
  if (!branch) return null;

  const staffCols = [
    { key: 'userNo', label: 'User No', render: (u: User) => <span className="font-mono text-xs text-blue-600">{u.userNo}</span> },
    { key: 'name', label: 'Name', render: (u: User) => `${u.firstName} ${u.lastName}` },
    { key: 'role', label: 'Role', render: (u: User) => ROLE_LABELS[u.role] },
    { key: 'status', label: 'Status', render: (u: User) => <StatusBadge status={u.status} /> },
    { key: 'lastLoginAt', label: 'Last Login', render: (u: User) => formatDate(u.lastLoginAt) },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={branch.name} subtitle={branch.branchCode} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.back()} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</button>
          <button onClick={() => router.push(`/branches/${id}/edit`)} className="btn-secondary ml-auto">
            <Edit className="w-4 h-4" /> Edit
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Clients" value={branch._count?.clients ?? 0} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatCard title="Active Loans" value={branch._count?.loans ?? 0} icon={CreditCard} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatCard title="Portfolio" value={formatCurrency((perf as Record<string, number>)?.portfolio || 0)} icon={CreditCard} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          <StatCard title="Collections MTD" value={formatCurrency((perf as Record<string, number>)?.collectionsMonth || 0)} icon={Users} iconBg="bg-teal-50" iconColor="text-teal-600" />
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="card p-6">
            <h3 className="section-title">Branch Info</h3>
            <dl className="space-y-3">
              {[
                ['Code', branch.branchCode],
                ['Region', branch.region],
                ['District', branch.district || '—'],
                ['Phone', branch.phone],
                ['Email', branch.email || '—'],
                ['Manager', branch.manager ? `${branch.manager.firstName} ${branch.manager.lastName}` : '—'],
                ['Status', <StatusBadge status={branch.status} />],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-sm">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900 text-right">{v as React.ReactNode}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="col-span-2 card p-6">
            <h3 className="section-title">Staff</h3>
            <DataTable columns={staffCols as never[]} data={staff as never[]}
              onRowClick={(u) => router.push(`/users/${(u as User).id}`)} />
          </div>
        </div>
      </div>
    </div>
  );
}
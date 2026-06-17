'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DataTable from '@/components/shared/DataTable';
import { collectionsApi, branchesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Branch, PaginationMeta } from '@/types';

interface OverdueLoan {
  id: string; loanNo: string; daysOverdue: number; arrearsAmount: number;
  client: { firstName: string; lastName: string; phonePrimary: string };
  branch: { name: string };
  loanOfficer?: { firstName: string; lastName: string };
  outstandingPrincipal: number;
}

export default function OverdueLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<OverdueLoan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [minDays, setMinDays] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await collectionsApi.getOverdue({ branchId, minDays, page, limit: 20 });
      setLoans(res.data.data); setMeta(res.data.meta);
    } catch {}
    setLoading(false);
  }, [branchId, minDays, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const getDaysBadge = (days: number) => {
    if (days > 90) return 'bg-red-200 text-red-900';
    if (days > 30) return 'bg-red-100 text-red-800';
    if (days > 7) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const columns = [
    { key: 'loanNo', label: 'Loan No', render: (l: OverdueLoan) => <span className="font-mono text-xs text-blue-600">{l.loanNo}</span> },
    { key: 'client', label: 'Client', render: (l: OverdueLoan) => <div><p>{l.client.firstName} {l.client.lastName}</p><p className="text-xs text-gray-400">{l.client.phonePrimary}</p></div> },
    { key: 'daysOverdue', label: 'Days Overdue', render: (l: OverdueLoan) => <span className={`badge ${getDaysBadge(l.daysOverdue)}`}>{l.daysOverdue} days</span> },
    { key: 'arrearsAmount', label: 'Arrears', render: (l: OverdueLoan) => <span className="text-red-700 font-semibold">{formatCurrency(l.arrearsAmount)}</span> },
    { key: 'outstanding', label: 'Outstanding', render: (l: OverdueLoan) => formatCurrency(l.outstandingPrincipal) },
    { key: 'branch', label: 'Branch', render: (l: OverdueLoan) => l.branch.name },
    { key: 'officer', label: 'Officer', render: (l: OverdueLoan) => l.loanOfficer ? `${l.loanOfficer.firstName} ${l.loanOfficer.lastName}` : '—' },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Overdue Loans" subtitle="Loans requiring collection attention" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={minDays} onChange={e => { setMinDays(e.target.value); setPage(1); }} className="input w-40">
              <option value="">All Overdue</option>
              <option value="1">1+ days</option>
              <option value="7">7+ days</option>
              <option value="30">30+ days</option>
              <option value="60">60+ days</option>
              <option value="90">90+ days</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
            <AlertTriangle className="w-4 h-4" />
            {meta?.total || 0} overdue loans
          </div>
        </div>
        <DataTable columns={columns as never[]} data={loans as never[]} loading={loading} meta={meta}
          onPageChange={setPage} onRowClick={(l) => router.push(`/loans/${(l as OverdueLoan).id}`)} />
      </div>
    </div>
  );
}
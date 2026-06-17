'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DataTable from '@/components/shared/DataTable';
import { repaymentsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Repayment, PaginationMeta } from '@/types';

export default function RepaymentsPage() {
  const router = useRouter();
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await repaymentsApi.list({ page, limit: 20, startDate: startDate || undefined, endDate: endDate || undefined });
      setRepayments(res.data.data);
      setMeta(res.data.meta);
    } catch {}
    setLoading(false);
  }, [page, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'receiptNo', label: 'Receipt No', render: (r: Repayment) => <span className="font-mono text-xs text-blue-600">{r.receiptNo}</span> },
    { key: 'client', label: 'Client', render: (r: Repayment) => r.client ? `${r.client.firstName} ${r.client.lastName}` : '—' },
    { key: 'loan', label: 'Loan No', render: (r: Repayment) => <span className="font-mono text-xs">{r.loan?.loanNo}</span> },
    { key: 'paymentDate', label: 'Date', render: (r: Repayment) => formatDate(r.paymentDate) },
    { key: 'amountReceived', label: 'Amount', render: (r: Repayment) => <span className="font-semibold text-green-700">{formatCurrency(r.amountReceived)}</span> },
    { key: 'collectionMethod', label: 'Method', render: (r: Repayment) => r.collectionMethod.replace(/_/g,' ') },
    { key: 'collectedBy', label: 'Collected By', render: (r: Repayment) => r.collectedBy ? `${r.collectedBy.firstName} ${r.collectedBy.lastName}` : '—' },
    { key: 'isReversed', label: 'Status', render: (r: Repayment) => <span className={`badge ${r.isReversed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.isReversed ? 'Reversed' : 'Posted'}</span> },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Repayments" subtitle="Loan repayment records" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="input w-36" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="input w-36" />
            <button onClick={() => repaymentsApi.dailySummary().then(r => router.push(`/repayments/daily?date=${new Date().toISOString().slice(0,10)}`)).catch(()=>{})} className="btn-secondary text-xs">Daily Summary</button>
          </div>
          <button onClick={() => router.push('/repayments/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> Record Repayment
          </button>
        </div>
        <DataTable columns={columns as never[]} data={repayments as never[]} loading={loading} meta={meta}
          onPageChange={setPage} onRowClick={(r) => router.push(`/repayments/${(r as Repayment).id}`)} />
      </div>
    </div>
  );
}
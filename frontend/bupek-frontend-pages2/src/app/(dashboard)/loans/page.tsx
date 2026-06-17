'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DataTable from '@/components/shared/DataTable';
import { loansApi, branchesApi } from '@/lib/api';
import { formatCurrency, formatDate, getLoanStatusColor } from '@/lib/utils';
import { Loan, Branch, PaginationMeta } from '@/types';
import PermissionGuard from '@/components/shared/PermissionGuard';

const STATUSES = ['PENDING','UNDER_REVIEW','RECOMMENDED','APPROVED','DISBURSED','ACTIVE','OVERDUE','PAID','WRITTEN_OFF','REJECTED'];

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loansApi.list({ search, status, branchId, page, limit: 20 });
      setLoans(res.data.data);
      setMeta(res.data.meta);
    } catch {}
    setLoading(false);
  }, [search, status, branchId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const columns = [
    { key: 'loanNo', label: 'Loan No', render: (l: Loan) => <span className="font-mono text-xs text-blue-600">{l.loanNo}</span> },
    { key: 'client', label: 'Client', render: (l: Loan) => l.client ? `${l.client.firstName} ${l.client.lastName}` : '—' },
    { key: 'product', label: 'Product', render: (l: Loan) => l.loanProduct?.name || '—' },
    { key: 'principal', label: 'Amount', render: (l: Loan) => formatCurrency(l.principal) },
    { key: 'outstanding', label: 'Outstanding', render: (l: Loan) => formatCurrency(l.outstandingPrincipal) },
    { key: 'status', label: 'Status', render: (l: Loan) => <span className={`badge ${getLoanStatusColor(l.status)}`}>{l.status.replace(/_/g,' ')}</span> },
    { key: 'disbursementDate', label: 'Disbursed', render: (l: Loan) => formatDate(l.disbursementDate) },
    { key: 'maturityDate', label: 'Maturity', render: (l: Loan) => formatDate(l.maturityDate) },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Loans" subtitle="Track all loan applications and disbursements" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9 w-56" placeholder="Loan no, client name…" />
            </div>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-36">
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="input w-44">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <a href="/loans/overdue" className="btn-secondary text-xs">View Overdue</a>
            <a href="/loans/products" className="btn-ghost text-xs">Products</a>
          </div>
          <PermissionGuard check={r => ['CEO_ADMIN','OPERATIONS_MANAGER','BRANCH_MANAGER','LOAN_OFFICER'].includes(r)}>
            <button onClick={() => router.push('/loans/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> New Loan
            </button>
          </PermissionGuard>
        </div>
        <DataTable columns={columns as never[]} data={loans as never[]} loading={loading} meta={meta}
          onPageChange={setPage} onRowClick={(l) => router.push(`/loans/${(l as Loan).id}`)} />
      </div>
    </div>
  );
}
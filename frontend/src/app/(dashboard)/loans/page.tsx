'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Eye, CheckCircle, XCircle, Banknote,
  BadgeDollarSign, Clock, AlertTriangle, ThumbsUp, Loader2
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Modal from '@/components/shared/Modal';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { loansApi, branchesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loan, Branch, PaginationMeta } from '@/types';
import { PERMISSIONS } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const STATUSES = ['PENDING','UNDER_REVIEW','RECOMMENDED','APPROVED','ACTIVE','OVERDUE','PAID','WRITTEN_OFF','REJECTED'];

const STATUS_STYLES: Record<string, string> = {
  PENDING:      'bg-amber-50 text-amber-700 border border-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 border border-blue-200',
  RECOMMENDED:  'bg-purple-50 text-purple-700 border border-purple-200',
  APPROVED:     'bg-teal-50 text-teal-700 border border-teal-200',
  ACTIVE:       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  OVERDUE:      'bg-red-50 text-red-700 border border-red-200',
  PAID:         'bg-gray-50 text-gray-600 border border-gray-200',
  WRITTEN_OFF:  'bg-gray-100 text-gray-500 border border-gray-200',
  REJECTED:     'bg-red-50 text-red-500 border border-red-100',
};

type ActionType = 'recommend' | 'approve' | 'reject' | 'disburse';

interface ActionModal {
  loan: Loan;
  type: ActionType;
}

export default function LoansPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role;

  const [loans, setLoans]       = useState<Loan[]>([]);
  const [meta, setMeta]         = useState<PaginationMeta | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [branchId, setBranchId] = useState('');
  const [page, setPage]         = useState(1);

  // Quick-action modal
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().slice(0, 10));
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loansApi.list({ search, status, branchId, page, limit: 20 });
      setLoans(res.data.data);
      setMeta(res.data.meta);
    } catch { toast.error('Failed to load loans'); }
    setLoading(false);
  }, [search, status, branchId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const closeModal = () => { setActionModal(null); setActionNotes(''); };

  const doAction = async () => {
    if (!actionModal) return;
    setActing(true);
    try {
      const { loan, type } = actionModal;
      if (type === 'recommend') await loansApi.recommend(loan.id, actionNotes);
      else if (type === 'approve')  await loansApi.approve(loan.id, actionNotes);
      else if (type === 'reject')   await loansApi.reject(loan.id, actionNotes);
      else if (type === 'disburse') await loansApi.disburse(loan.id, { disbursementDate: disburseDate });
      toast.success(`Loan ${type}d successfully`);
      closeModal();
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Action failed');
    }
    setActing(false);
  };

  // Permission helpers
  const canRecommend = (l: Loan) => role && PERMISSIONS.canRecommendLoan(role) && ['PENDING','UNDER_REVIEW'].includes(l.status);
  const canApprove   = (l: Loan) => role && PERMISSIONS.canApproveLoan(role)   && ['PENDING','UNDER_REVIEW','RECOMMENDED'].includes(l.status);
  const canReject    = (l: Loan) => role && PERMISSIONS.canApproveLoan(role)   && ['PENDING','UNDER_REVIEW','RECOMMENDED','APPROVED'].includes(l.status);
  const canDisburse  = (l: Loan) => role && PERMISSIONS.canDisburseLoan(role)  && l.status === 'APPROVED';

  const totalLoans   = meta?.total ?? loans.length;
  const pendingCount = loans.filter(l => l.status === 'PENDING').length;
  const activeCount  = loans.filter(l => l.status === 'ACTIVE').length;
  const overdueCount = loans.filter(l => l.status === 'OVERDUE').length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Loans" subtitle="Manage loan applications and disbursements" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Loans', value: totalLoans,   color: 'bg-blue-500',    icon: BadgeDollarSign },
            { label: 'Pending',     value: pendingCount, color: 'bg-amber-500',   icon: Clock },
            { label: 'Active',      value: activeCount,  color: 'bg-emerald-500', icon: CheckCircle },
            { label: 'Overdue',     value: overdueCount, color: 'bg-red-500',     icon: AlertTriangle },
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

        {/* Toolbar */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="input pl-9 w-56 py-2" placeholder="Loan no, client name…" />
              </div>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-36 py-2">
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="input w-44 py-2">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <PermissionGuard check={r => PERMISSIONS.canCreateLoan(r)}>
              <button onClick={() => router.push('/loans/new')} className="btn-primary">
                <Plus className="w-4 h-4" /> New Loan
              </button>
            </PermissionGuard>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Loan Portfolio</h3>
            <span className="text-sm text-gray-500">{totalLoans} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : loans.length === 0 ? (
            <div className="py-16 text-center">
              <BadgeDollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-500">No loans found</p>
              <button onClick={() => router.push('/loans/new')} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> New Loan Application
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loan No</th>
                    <th>Client</th>
                    <th>Product</th>
                    <th className="text-right">Principal</th>
                    <th className="text-right">Outstanding</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(l => (
                    <tr key={l.id}>
                      <td>
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {l.loanNo}
                        </span>
                      </td>
                      <td>
                        {l.client ? (
                          <div>
                            <p className="font-medium text-gray-900">{l.client.firstName} {l.client.lastName}</p>
                            <p className="text-xs text-gray-400">{(l.client as any).clientNo}</p>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="text-sm text-gray-600">{l.loanProduct?.name || '—'}</td>
                      <td className="text-right font-semibold text-gray-800">{formatCurrency(l.principal)}</td>
                      <td className="text-right">
                        <span className={Number(l.outstandingPrincipal) > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>
                          {formatCurrency(l.outstandingPrincipal)}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {l.status.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td className="text-sm text-gray-400">{formatDate(l.applicationDate)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">

                          {/* View detail */}
                          <button onClick={() => router.push(`/loans/${l.id}`)}
                            title="View details"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Recommend */}
                          {canRecommend(l) && (
                            <button
                              onClick={() => { setActionModal({ loan: l, type: 'recommend' }); setActionNotes(''); }}
                              title="Recommend loan"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                          )}

                          {/* Approve */}
                          {canApprove(l) && (
                            <button
                              onClick={() => { setActionModal({ loan: l, type: 'approve' }); setActionNotes(''); }}
                              title="Approve loan"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reject */}
                          {canReject(l) && (
                            <button
                              onClick={() => { setActionModal({ loan: l, type: 'reject' }); setActionNotes(''); }}
                              title="Reject loan"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Disburse */}
                          {canDisburse(l) && (
                            <button
                              onClick={() => { setActionModal({ loan: l, type: 'disburse' }); setDisburseDate(new Date().toISOString().slice(0,10)); }}
                              title="Disburse loan"
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors">
                              <Banknote className="w-4 h-4" />
                            </button>
                          )}

                          {/* Record payment */}
                          {['ACTIVE','OVERDUE'].includes(l.status) && (
                            <button onClick={() => router.push(`/repayments/new?loanId=${l.id}`)}
                              title="Record payment"
                              className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors">
                              <Banknote className="w-4 h-4" />
                            </button>
                          )}

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
              <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-1">
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
      </div>

      {/* ── Quick-Action Modal ── */}
      {actionModal && (
        <Modal
          open
          onClose={closeModal}
          title={
            actionModal.type === 'recommend' ? '👍 Recommend Loan' :
            actionModal.type === 'approve'   ? '✅ Approve Loan' :
            actionModal.type === 'reject'    ? '❌ Reject Loan' :
                                               '💰 Disburse Loan'
          }
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="btn-secondary" disabled={acting}>Cancel</button>
              <button onClick={doAction} disabled={acting}
                className={actionModal.type === 'reject' ? 'btn-danger' : 'btn-primary'}>
                {acting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : `Confirm ${actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)}`
                }
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Loan summary */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{actionModal.loan.loanNo}</p>
                <p className="text-sm text-gray-500">
                  {actionModal.loan.client?.firstName} {actionModal.loan.client?.lastName}
                </p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_STYLES[actionModal.loan.status] ?? ''}`}>
                  {actionModal.loan.status.replace(/_/g,' ')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{formatCurrency(actionModal.loan.principal)}</p>
                <p className="text-xs text-gray-400">Principal</p>
              </div>
            </div>

            {/* Input */}
            {actionModal.type === 'disburse' ? (
              <div>
                <label className="form-label">Disbursement Date <span className="text-red-500">*</span></label>
                <input type="date" value={disburseDate} onChange={e => setDisburseDate(e.target.value)} className="input" />
                <p className="text-xs text-gray-400 mt-1">The full repayment schedule will be generated from this date.</p>
              </div>
            ) : (
              <div>
                <label className="form-label">
                  {actionModal.type === 'reject' ? 'Rejection Reason' : 'Notes'}
                  {actionModal.type === 'reject' && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder={
                    actionModal.type === 'reject'    ? 'Explain why this loan is being rejected…' :
                    actionModal.type === 'recommend' ? 'Add your recommendation notes (optional)…' :
                    'Add approval notes (optional)…'
                  }
                />
              </div>
            )}

            {/* Context messages */}
            {actionModal.type === 'approve' && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700">
                ✓ Approving will allow this loan to be disbursed next.
              </div>
            )}
            {actionModal.type === 'disburse' && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700">
                ✓ Disbursing will activate the loan and generate the full repayment schedule.
              </div>
            )}
            {actionModal.type === 'reject' && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
                ⚠ This action cannot be undone. The loan will be permanently rejected.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

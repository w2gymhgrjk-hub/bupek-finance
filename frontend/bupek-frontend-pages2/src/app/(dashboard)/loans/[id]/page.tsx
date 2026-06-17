'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Modal from '@/components/shared/Modal';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { loansApi } from '@/lib/api';
import { formatCurrency, formatDate, getLoanStatusColor, getScheduleStatusColor } from '@/lib/utils';
import { Loan } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@/lib/permissions';
import toast from 'react-hot-toast';

type Tab = 'details' | 'schedule' | 'workflow' | 'repayments';

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [actionModal, setActionModal] = useState<null | 'recommend' | 'approve' | 'reject' | 'disburse' | 'writeoff'>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    loansApi.getById(id).then(r => setLoan(r.data.data)).catch(() => router.push('/loans')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async () => {
    if (!actionModal || !loan) return;
    setActionLoading(true);
    try {
      if (actionModal === 'recommend') await loansApi.recommend(id, actionNotes);
      else if (actionModal === 'approve') await loansApi.approve(id, actionNotes);
      else if (actionModal === 'reject') await loansApi.reject(id, actionNotes);
      else if (actionModal === 'disburse') await loansApi.disburse(id, { notes: actionNotes });
      else if (actionModal === 'writeoff') await loansApi.writeOff(id, actionNotes);
      toast.success(`Loan ${actionModal}d successfully`);
      setActionModal(null); setActionNotes(''); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Action failed');
    }
    setActionLoading(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>;
  if (!loan) return null;

  const role = user?.role;
  const canRecommend = role && PERMISSIONS.canRecommendLoan(role) && loan.status === 'PENDING';
  const canApprove = role && PERMISSIONS.canApproveLoan(role) && ['UNDER_REVIEW', 'RECOMMENDED'].includes(loan.status);
  const canReject = role && PERMISSIONS.canApproveLoan(role) && !['REJECTED','PAID','WRITTEN_OFF'].includes(loan.status);
  const canDisburse = role && PERMISSIONS.canDisburseLoan(role) && loan.status === 'APPROVED';
  const canWriteOff = role && PERMISSIONS.canWriteOffLoan(role) && loan.status === 'OVERDUE';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={loan.loanNo} subtitle={`${loan.client?.firstName} ${loan.client?.lastName}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => router.back()} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</button>
          <span className={`badge ${getLoanStatusColor(loan.status)} ml-2`}>{loan.status.replace(/_/g,' ')}</span>
          <div className="ml-auto flex gap-2 flex-wrap">
            {canRecommend && <button onClick={() => setActionModal('recommend')} className="btn-secondary text-xs"><CheckCircle className="w-3.5 h-3.5" /> Recommend</button>}
            {canApprove && <button onClick={() => setActionModal('approve')} className="btn-primary text-xs"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>}
            {canReject && <button onClick={() => setActionModal('reject')} className="btn-danger text-xs"><XCircle className="w-3.5 h-3.5" /> Reject</button>}
            {canDisburse && <button onClick={() => setActionModal('disburse')} className="btn-primary text-xs"><DollarSign className="w-3.5 h-3.5" /> Disburse</button>}
            {canWriteOff && <button onClick={() => setActionModal('writeoff')} className="btn-danger text-xs"><AlertTriangle className="w-3.5 h-3.5" /> Write Off</button>}
            {['ACTIVE','OVERDUE'].includes(loan.status) && (
              <button onClick={() => router.push(`/repayments/new?loanId=${id}`)} className="btn-primary text-xs">Record Repayment</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-5 gap-1">
          {(['details','schedule','workflow','repayments'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t}</button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="section-title">Loan Details</h3>
              <dl className="space-y-3">
                {[
                  ['Loan No', loan.loanNo],
                  ['Product', loan.loanProduct?.name || '—'],
                  ['Principal', formatCurrency(loan.principal)],
                  ['Interest Rate', `${loan.interestRate}% (${loan.interestType})`],
                  ['Term', `${loan.termMonths} months`],
                  ['Frequency', loan.repaymentFrequency],
                  ['Processing Fee', formatCurrency(loan.processingFee)],
                  ['Insurance Fee', formatCurrency(loan.insuranceFee)],
                  ['Total Loan Amount', formatCurrency(loan.totalLoanAmount)],
                  ['Purpose', loan.purpose || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-gray-900 text-right">{v as string}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="section-title">Outstanding Balance</h3>
                <dl className="space-y-3">
                  {[
                    ['Outstanding Principal', formatCurrency(loan.outstandingPrincipal)],
                    ['Outstanding Interest', formatCurrency(loan.outstandingInterest)],
                    ['Total Paid', formatCurrency(loan.totalPaid)],
                    ['Application Date', formatDate(loan.applicationDate)],
                    ['Approved Date', formatDate(loan.approvedDate)],
                    ['Disbursement Date', formatDate(loan.disbursementDate)],
                    ['Maturity Date', formatDate(loan.maturityDate)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-medium text-gray-900 text-right">{v as string}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="card p-5">
                <p className="text-xs text-gray-500 mb-1">Branch</p>
                <p className="font-medium text-gray-900">{loan.branch?.name}</p>
                <p className="text-xs text-gray-500 mt-3 mb-1">Loan Officer</p>
                <p className="font-medium text-gray-900">{loan.loanOfficer ? `${loan.loanOfficer.firstName} ${loan.loanOfficer.lastName}` : '—'}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr>
                <th>#</th><th>Due Date</th><th>Principal</th><th>Interest</th>
                <th>Penalty</th><th>Total Due</th><th>Total Paid</th><th>Status</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {(loan.schedules || []).map(s => (
                  <tr key={s.id} className={s.status === 'OVERDUE' ? 'bg-red-50/40' : ''}>
                    <td>{s.installmentNo}</td>
                    <td>{formatDate(s.dueDate)}</td>
                    <td>{formatCurrency(s.principalDue)}</td>
                    <td>{formatCurrency(s.interestDue)}</td>
                    <td className={Number(s.penaltyDue) > 0 ? 'text-red-600' : ''}>{formatCurrency(s.penaltyDue)}</td>
                    <td className="font-medium">{formatCurrency(s.totalDue)}</td>
                    <td className="text-green-700">{formatCurrency(s.totalPaid)}</td>
                    <td><span className={`badge ${getScheduleStatusColor(s.status)}`}>{s.status}</span></td>
                  </tr>
                ))}
                {!loan.schedules?.length && <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No schedule generated yet. Disburse the loan to generate the schedule.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'workflow' && (
          <div className="space-y-3">
            {(loan.workflow || []).map((w, i) => (
              <div key={w.id} className="card p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 text-xs font-bold">{i+1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{w.action}</span>
                    <span className="text-xs text-gray-400">{formatDate(w.createdAt, 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {w.actor?.firstName} {w.actor?.lastName} ({w.actor?.role?.replace(/_/g,' ')})
                    {w.fromStatus && ` · ${w.fromStatus} → ${w.toStatus}`}
                  </p>
                  {w.notes && <p className="text-sm text-gray-600 mt-1 italic">{w.notes}</p>}
                </div>
              </div>
            ))}
            {!loan.workflow?.length && <p className="text-gray-400 text-sm">No workflow history.</p>}
          </div>
        )}

        {tab === 'repayments' && (
          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr>
                <th>Receipt No</th><th>Date</th><th>Amount</th><th>Principal</th>
                <th>Interest</th><th>Method</th><th>Status</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {(loan.repayments || []).map(r => (
                  <tr key={r.id} className={r.isReversed ? 'opacity-50 line-through' : ''}>
                    <td><span className="font-mono text-xs text-blue-600">{r.receiptNo}</span></td>
                    <td>{formatDate(r.paymentDate)}</td>
                    <td>{formatCurrency(r.amountReceived)}</td>
                    <td>{formatCurrency(r.principalPaid)}</td>
                    <td>{formatCurrency(r.interestPaid)}</td>
                    <td>{r.collectionMethod.replace(/_/g,' ')}</td>
                    <td><span className={`badge ${r.isReversed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.isReversed ? 'Reversed' : 'Active'}</span></td>
                  </tr>
                ))}
                {!loan.repayments?.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No repayments recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Modal */}
        <Modal open={!!actionModal} onClose={() => { setActionModal(null); setActionNotes(''); }} title={`${actionModal?.charAt(0).toUpperCase()}${actionModal?.slice(1)} Loan`}
          footer={<div className="flex gap-2 justify-end">
            <button onClick={() => setActionModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={doAction} disabled={actionLoading} className={actionModal === 'reject' || actionModal === 'writeoff' ? 'btn-danger' : 'btn-primary'}>
              {actionLoading ? 'Processing…' : 'Confirm'}
            </button>
          </div>}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Loan: <strong>{loan.loanNo}</strong> — {formatCurrency(loan.principal)}</p>
            <div>
              <label className="label">Notes / Reason {(actionModal === 'reject' || actionModal === 'writeoff') && '*'}</label>
              <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)}
                className="input" rows={3} placeholder="Add notes…" />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
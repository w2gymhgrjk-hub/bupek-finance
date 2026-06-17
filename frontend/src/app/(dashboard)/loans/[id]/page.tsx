'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, XCircle, DollarSign, AlertTriangle,
  Clock, Banknote, User, Building2, Calendar, TrendingUp,
  ThumbsUp, FileText, CreditCard
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Modal from '@/components/shared/Modal';
import { loansApi } from '@/lib/api';
import { formatCurrency, formatDate, getLoanStatusColor, getScheduleStatusColor } from '@/lib/utils';
import { Loan } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@/lib/permissions';
import toast from 'react-hot-toast';

type Tab = 'details' | 'schedule' | 'workflow' | 'repayments';

const WORKFLOW_STEPS = [
  { key: 'SUBMITTED',   label: 'Submitted',  icon: FileText },
  { key: 'RECOMMENDED', label: 'Reviewed',   icon: ThumbsUp },
  { key: 'APPROVED',    label: 'Approved',   icon: CheckCircle },
  { key: 'DISBURSED',   label: 'Disbursed',  icon: Banknote },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, UNDER_REVIEW: 1, RECOMMENDED: 1,
  APPROVED: 2, ACTIVE: 3, OVERDUE: 3, PAID: 4, WRITTEN_OFF: 4, REJECTED: -1,
};

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuthStore();
  const [loan, setLoan]     = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<Tab>('details');
  const [modal, setModal]   = useState<null | 'recommend' | 'approve' | 'reject' | 'disburse' | 'writeoff'>(null);
  const [notes, setNotes]   = useState('');
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().slice(0,10));
  const [acting, setActing] = useState(false);

  const load = () => {
    setLoading(true);
    loansApi.getById(id)
      .then(r => setLoan(r.data.data))
      .catch(() => router.push('/loans'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const doAction = async () => {
    if (!modal || !loan) return;
    setActing(true);
    try {
      if (modal === 'recommend') await loansApi.recommend(id, notes);
      else if (modal === 'approve')  await loansApi.approve(id, notes);
      else if (modal === 'reject')   await loansApi.reject(id, notes);
      else if (modal === 'disburse') await loansApi.disburse(id, { disbursementDate: disburseDate });
      else if (modal === 'writeoff') await loansApi.writeOff(id, notes);
      toast.success('Action completed successfully');
      setModal(null); setNotes(''); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Action failed');
    }
    setActing(false);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="spinner-lg" />
    </div>
  );
  if (!loan) return null;

  const role        = user?.role;
  const statusOrder = STATUS_ORDER[loan.status] ?? 0;

  const canRecommend = role && PERMISSIONS.canRecommendLoan(role) && ['PENDING','UNDER_REVIEW'].includes(loan.status);
  const canApprove   = role && PERMISSIONS.canApproveLoan(role) && ['PENDING','UNDER_REVIEW','RECOMMENDED'].includes(loan.status);
  const canReject    = role && PERMISSIONS.canApproveLoan(role) && !['REJECTED','PAID','WRITTEN_OFF','ACTIVE','OVERDUE'].includes(loan.status);
  const canDisburse  = role && PERMISSIONS.canDisburseLoan(role) && loan.status === 'APPROVED';
  const canWriteOff  = role && PERMISSIONS.canWriteOffLoan(role) && ['ACTIVE','OVERDUE'].includes(loan.status);
  const canRepay     = role && ['ACTIVE','OVERDUE'].includes(loan.status);

  const hasActions = canRecommend || canApprove || canReject || canDisburse || canWriteOff || canRepay;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={loan.loanNo} subtitle={`${loan.client?.firstName ?? ''} ${loan.client?.lastName ?? ''}`} />

      <div className="flex-1 overflow-y-auto">

        {/* ── Status Banner ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">

            {/* Back + status badge */}
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="btn-ghost -ml-2">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{loan.loanNo}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getLoanStatusColor(loan.status)}`}>
                    {loan.status.replace(/_/g,' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {loan.client?.firstName} {loan.client?.lastName} · {loan.loanProduct?.name}
                </p>
              </div>
            </div>

            {/* Action Buttons — role-gated */}
            {hasActions && (
              <div className="flex flex-wrap items-center gap-2">
                {canRecommend && (
                  <button onClick={() => setModal('recommend')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 border border-blue-200 transition-colors">
                    <ThumbsUp className="w-4 h-4" /> Recommend
                  </button>
                )}
                {canApprove && (
                  <button onClick={() => setModal('approve')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                    <CheckCircle className="w-4 h-4" /> Approve Loan
                  </button>
                )}
                {canReject && (
                  <button onClick={() => setModal('reject')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 border border-red-200 transition-colors">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                )}
                {canDisburse && (
                  <button onClick={() => setModal('disburse')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm">
                    <DollarSign className="w-4 h-4" /> Disburse Funds
                  </button>
                )}
                {canWriteOff && (
                  <button onClick={() => setModal('writeoff')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                    <AlertTriangle className="w-4 h-4" /> Write Off
                  </button>
                )}
                {canRepay && (
                  <button onClick={() => router.push(`/repayments/new?loanId=${id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
                    <CreditCard className="w-4 h-4" /> Record Payment
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Visual Workflow Progress ── */}
          {loan.status !== 'REJECTED' && (
            <div className="mt-5 flex items-center gap-0">
              {WORKFLOW_STEPS.map((step, i) => {
                const done    = statusOrder > i;
                const current = statusOrder === i;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className={`flex flex-col items-center flex-1 ${i > 0 ? 'relative' : ''}`}>
                      {i > 0 && <div className={`absolute left-0 right-1/2 top-4 h-0.5 ${done || current ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                      {i < WORKFLOW_STEPS.length - 1 && <div className={`absolute left-1/2 right-0 top-4 h-0.5 ${done ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        done    ? 'bg-emerald-500 border-emerald-500 text-white' :
                        current ? 'bg-white border-blue-500 text-blue-600' :
                                  'bg-white border-gray-200 text-gray-300'
                      }`}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      <p className={`mt-1.5 text-xs font-medium ${done || current ? 'text-gray-700' : 'text-gray-400'}`}>{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {loan.status === 'REJECTED' && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl border border-red-100 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>This loan was <strong>rejected</strong>{loan.rejectionReason ? `: ${loan.rejectionReason}` : '.'}</span>
            </div>
          )}
        </div>

        {/* ── Quick Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 pb-2">
          {[
            { label: 'Principal',     value: formatCurrency(loan.principal),            icon: DollarSign,   color: 'bg-blue-500' },
            { label: 'Outstanding',   value: formatCurrency(loan.outstandingPrincipal), icon: TrendingUp,   color: 'bg-amber-500' },
            { label: 'Total Paid',    value: formatCurrency(loan.totalPaid),            icon: CheckCircle,  color: 'bg-emerald-500' },
            { label: 'Maturity',      value: loan.maturityDate ? formatDate(loan.maturityDate) : 'TBD', icon: Calendar, color: 'bg-purple-500' },
          ].map(c => (
            <div key={c.label} className="card flex items-center gap-3 p-4">
              <div className={`w-9 h-9 rounded-xl ${c.color} flex items-center justify-center text-white flex-shrink-0`}>
                <c.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-400">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="px-6">
          <div className="flex border-b border-gray-200 gap-1">
            {(['details','schedule','workflow','repayments'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                  tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="p-6 pt-4 space-y-4">

          {/* ── Details Tab ── */}
          {tab === 'details' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-5 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> Loan Terms
                </h3>
                <dl className="space-y-2.5">
                  {([
                    ['Product',       loan.loanProduct?.name || '—'],
                    ['Principal',     formatCurrency(loan.principal)],
                    ['Interest Rate', `${loan.interestRate}% ${loan.interestType === 'FLAT' ? '(Flat)' : '(Reducing)'}`],
                    ['Term',          `${loan.term} ${(loan.termUnit ?? 'MONTHS').toLowerCase()}`],
                    ['Frequency',     loan.repaymentFrequency?.replace(/_/g,' ')],
                    ['Processing Fee',formatCurrency(loan.processingFee)],
                    ['Insurance Fee', formatCurrency(loan.insuranceFee)],
                    ['Total Repayable',formatCurrency(loan.totalRepayable ?? 0)],
                    ['Purpose',       loan.purpose || '—'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-medium text-gray-900 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-amber-500" /> Timeline & Balance
                  </h3>
                  <dl className="space-y-2.5">
                    {([
                      ['Application Date',  formatDate(loan.applicationDate)],
                      ['Approval Date',     formatDate(loan.approvalDate ?? loan.approvedDate)],
                      ['Disbursement Date', formatDate(loan.disbursementDate)],
                      ['Maturity Date',     formatDate(loan.maturityDate)],
                      ['Outstanding Principal', formatCurrency(loan.outstandingPrincipal)],
                      ['Outstanding Interest',  formatCurrency(loan.outstandingInterest)],
                      ['Total Paid',            formatCurrency(loan.totalPaid)],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                        <dt className="text-gray-500">{k}</dt>
                        <dd className="font-medium text-gray-900 text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-purple-500" /> Branch & Officer
                  </h3>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-0.5">Branch</p>
                      <p className="font-medium text-gray-900">{loan.branch?.name || '—'}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-0.5">Loan Officer</p>
                      <p className="font-medium text-gray-900">
                        {loan.loanOfficer ? `${loan.loanOfficer.firstName} ${loan.loanOfficer.lastName}` : '—'}
                      </p>
                    </div>
                  </div>
                  {(loan.approvedBy || loan.disbursedBy) && (
                    <div className="flex items-start gap-3 mt-3 pt-3 border-t border-gray-100">
                      {loan.approvedBy && (
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-0.5">Approved By</p>
                          <p className="font-medium text-gray-900">{(loan.approvedBy as any).firstName} {(loan.approvedBy as any).lastName}</p>
                        </div>
                      )}
                      {loan.disbursedBy && (
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-0.5">Disbursed By</p>
                          <p className="font-medium text-gray-900">{(loan.disbursedBy as any).firstName} {(loan.disbursedBy as any).lastName}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Schedule Tab ── */}
          {tab === 'schedule' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Repayment Schedule</h3>
              </div>
              {!loan.schedules?.length ? (
                <div className="py-12 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No schedule yet. Disburse the loan to generate the repayment schedule.</p>
                  {canDisburse && (
                    <button onClick={() => setModal('disburse')} className="btn-primary mt-3">
                      <DollarSign className="w-4 h-4" /> Disburse Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Due Date</th><th>Principal</th><th>Interest</th>
                      <th>Penalty</th><th>Total Due</th><th>Total Paid</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {loan.schedules.map(s => (
                        <tr key={s.id} className={s.status === 'OVERDUE' ? 'bg-red-50/40' : ''}>
                          <td>{s.installmentNo}</td>
                          <td>{formatDate(s.dueDate)}</td>
                          <td>{formatCurrency(s.principalDue)}</td>
                          <td>{formatCurrency(s.interestDue)}</td>
                          <td className={Number(s.penaltyDue) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{formatCurrency(s.penaltyDue)}</td>
                          <td className="font-semibold">{formatCurrency(s.totalDue)}</td>
                          <td className="text-emerald-700">{formatCurrency(s.totalPaid)}</td>
                          <td><span className={`badge ${getScheduleStatusColor(s.status)}`}>{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Workflow Tab ── */}
          {tab === 'workflow' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Approval History</h3>
              {(loan.workflow || []).length === 0 ? (
                <p className="text-gray-400 text-sm">No workflow history.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                  {(loan.workflow || []).map((w, i) => {
                    const isLast = i === (loan.workflow?.length ?? 0) - 1;
                    const isGood = ['SUBMITTED','RECOMMENDED','APPROVED','DISBURSED'].includes(w.action);
                    const isBad  = ['REJECTED','WRITTEN_OFF'].includes(w.action);
                    return (
                      <div key={w.id} className={`relative pl-10 ${isLast ? '' : 'pb-5'}`}>
                        <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                          isBad ? 'bg-red-500' : isGood ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}>
                          <span className="text-white text-xs font-bold">{i + 1}</span>
                        </div>
                        <div className="card p-4">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold text-sm ${isBad ? 'text-red-700' : isGood ? 'text-emerald-700' : 'text-blue-700'}`}>
                              {w.action.replace(/_/g,' ')}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(w.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-medium">{w.actor?.firstName} {w.actor?.lastName}</span>
                            {w.actor?.role && <span> · {(w.actor.role as string).replace(/_/g,' ')}</span>}
                          </p>
                          {w.notes && <p className="text-sm text-gray-600 mt-1.5 italic bg-gray-50 rounded-lg px-3 py-2">{w.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Repayments Tab ── */}
          {tab === 'repayments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Payment History</h3>
                {canRepay && (
                  <button onClick={() => router.push(`/repayments/new?loanId=${id}`)} className="btn-primary text-sm">
                    <CreditCard className="w-4 h-4" /> Record Payment
                  </button>
                )}
              </div>
              <div className="card overflow-hidden">
                {!loan.repayments?.length ? (
                  <div className="py-12 text-center">
                    <Banknote className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr><th>Receipt No</th><th>Date</th><th>Amount</th>
                        <th>Principal</th><th>Interest</th><th>Method</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {loan.repayments.map(r => (
                          <tr key={r.id} className={r.isReversed ? 'opacity-50' : ''}>
                            <td><span className="font-mono text-xs text-blue-600">{r.receiptNo}</span></td>
                            <td>{formatDate(r.paymentDate)}</td>
                            <td className="font-semibold">{formatCurrency(r.amountReceived)}</td>
                            <td>{formatCurrency(r.principalPaid)}</td>
                            <td>{formatCurrency(r.interestPaid)}</td>
                            <td className="text-gray-500 text-sm">{r.collectionMethod?.replace(/_/g,' ')}</td>
                            <td>
                              <span className={`badge ${r.isReversed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {r.isReversed ? 'Reversed' : 'Posted'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action Modal ── */}
      <Modal
        open={!!modal}
        onClose={() => { setModal(null); setNotes(''); }}
        title={
          modal === 'recommend' ? 'Recommend Loan' :
          modal === 'approve'   ? 'Approve Loan' :
          modal === 'reject'    ? 'Reject Loan' :
          modal === 'disburse'  ? 'Disburse Loan' :
          modal === 'writeoff'  ? 'Write Off Loan' : ''
        }
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setModal(null); setNotes(''); }} className="btn-secondary" disabled={acting}>Cancel</button>
            <button onClick={doAction} disabled={acting}
              className={modal === 'reject' || modal === 'writeoff' ? 'btn-danger' : 'btn-primary'}>
              {acting ? 'Processing…' : 'Confirm'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{loan.loanNo}</p>
              <p className="text-sm text-gray-500">{loan.client?.firstName} {loan.client?.lastName}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 text-lg">{formatCurrency(loan.principal)}</p>
              <p className="text-xs text-gray-400">Principal</p>
            </div>
          </div>

          {modal === 'disburse' ? (
            <div>
              <label className="form-label">Disbursement Date <span className="text-red-500">*</span></label>
              <input type="date" value={disburseDate} onChange={e => setDisburseDate(e.target.value)} className="input" />
              <p className="text-xs text-gray-400 mt-1">The repayment schedule will be generated from this date.</p>
            </div>
          ) : (
            <div>
              <label className="form-label">
                {modal === 'reject' ? 'Rejection Reason' : modal === 'writeoff' ? 'Write-Off Reason' : 'Notes'}
                {(modal === 'reject' || modal === 'writeoff') && <span className="text-red-500"> *</span>}
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="input" rows={3}
                placeholder={
                  modal === 'reject'    ? 'Explain why this loan is being rejected…' :
                  modal === 'writeoff'  ? 'Explain the reason for writing off this loan…' :
                  modal === 'recommend' ? 'Add your recommendation notes…' :
                  'Add approval notes (optional)…'
                } />
            </div>
          )}

          {(modal === 'approve' || modal === 'disburse') && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              {modal === 'approve'
                ? '✓ Approving this loan will allow it to proceed to disbursement.'
                : '✓ Disbursing will activate the loan and generate the full repayment schedule.'}
            </div>
          )}
          {(modal === 'reject' || modal === 'writeoff') && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
              ⚠ This action cannot be undone. The loan status will be permanently updated.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

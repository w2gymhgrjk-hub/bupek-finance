'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Search, Loader2, CreditCard } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { repaymentsApi, loansApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Loan } from '@/types';

const schema = z.object({
  loanId:           z.string().min(1, 'Select a loan'),
  amountReceived:   z.number({ coerce: true }).min(0.01, 'Enter amount'),
  paymentDate:      z.string().min(1, 'Date required'),
  collectionMethod: z.string().min(1, 'Select method'),
  referenceNo:      z.string().optional(),
  notes:            z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewRepaymentPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const preLoanId   = searchParams.get('loanId') || '';

  const [loans, setLoans]         = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [saved, setSaved]         = useState<{ receiptNo: string; id: string } | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      loanId:     preLoanId,
      paymentDate: new Date().toISOString().slice(0, 10),
    },
  });

  const loanId = watch('loanId');

  // Load active/overdue loans
  useEffect(() => {
    loansApi.list({ status: 'ACTIVE', limit: 200 })
      .then(r => {
        const active = r.data.data ?? [];
        // also fetch OVERDUE
        return loansApi.list({ status: 'OVERDUE', limit: 200 })
          .then(r2 => setLoans([...active, ...(r2.data.data ?? [])]))
          .catch(() => setLoans(active));
      })
      .catch(() => toast.error('Failed to load loans'))
      .finally(() => setLoadingLoans(false));
  }, []);

  // When preLoanId set, find it in list or fetch directly
  useEffect(() => {
    if (!preLoanId) return;
    loansApi.getById(preLoanId)
      .then(r => setSelectedLoan(r.data.data))
      .catch(() => {});
  }, [preLoanId]);

  // When loanId changes, update selectedLoan
  useEffect(() => {
    if (!loanId) { setSelectedLoan(null); return; }
    const found = loans.find(l => l.id === loanId);
    if (found) setSelectedLoan(found);
    else {
      loansApi.getById(loanId)
        .then(r => setSelectedLoan(r.data.data))
        .catch(() => setSelectedLoan(null));
    }
  }, [loanId, loans]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await repaymentsApi.record(data);
      toast.success(`Payment recorded — Receipt: ${res.data.data.receiptNo}`);
      setSaved({ receiptNo: res.data.data.receiptNo, id: res.data.data.id });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to record payment');
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="Payment Recorded" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card p-10 text-center max-w-md w-full">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful</h2>
            <p className="text-gray-500 text-sm mb-6">
              Receipt: <span className="font-mono font-bold text-blue-600">{saved.receiptNo}</span>
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => router.push(`/repayments/${saved.id}`)} className="btn-primary">View Receipt</button>
              <button onClick={() => setSaved(null)} className="btn-secondary">New Payment</button>
              <button onClick={() => router.push('/repayments')} className="btn-ghost">Back to List</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Record Repayment" subtitle="Record a loan payment" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <button onClick={() => router.back()} className="btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Loan Selection ── */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Search className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="card-title">Select Loan</h3>
                </div>
              </div>
              <div className="card-body">
                {loadingLoans ? (
                  <div className="input flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading loans…
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Loan <span className="text-red-500">*</span></label>
                    <select
                      {...register('loanId')}
                      className={`input ${errors.loanId ? 'input-error' : ''}`}
                    >
                      <option value="">Select active loan…</option>
                      {loans.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.loanNo} — {(l as any).client?.firstName} {(l as any).client?.lastName} — TZS {Number(l.outstandingPrincipal).toLocaleString()} outstanding
                        </option>
                      ))}
                    </select>
                    {errors.loanId && <p className="form-error">{errors.loanId.message}</p>}
                    {loans.length === 0 && (
                      <p className="form-hint text-amber-600">No active loans found. Disburse a loan first.</p>
                    )}
                  </div>
                )}

                {/* Loan summary card */}
                {selectedLoan && (
                  <div className="mt-4 grid grid-cols-3 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div>
                      <p className="text-xs text-blue-500 mb-0.5">Loan No</p>
                      <p className="font-mono font-bold text-blue-700 text-sm">{selectedLoan.loanNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-500 mb-0.5">Outstanding</p>
                      <p className="font-bold text-blue-900">{formatCurrency(selectedLoan.outstandingPrincipal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-500 mb-0.5">Status</p>
                      <p className="font-medium text-blue-900">{selectedLoan.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment Details ── */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="card-title">Payment Details</h3>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="form-group">
                    <label className="form-label">Amount Received (TZS) <span className="text-red-500">*</span></label>
                    <input
                      {...register('amountReceived', { valueAsNumber: true })}
                      type="number" step="100" min="1"
                      className={`input text-lg font-bold ${errors.amountReceived ? 'input-error' : ''}`}
                      placeholder="0"
                    />
                    {errors.amountReceived && <p className="form-error">{errors.amountReceived.message}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date <span className="text-red-500">*</span></label>
                    <input {...register('paymentDate')} type="date" className="input" />
                    {errors.paymentDate && <p className="form-error">{errors.paymentDate.message}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Collection Method <span className="text-red-500">*</span></label>
                    <select {...register('collectionMethod')} className={`input ${errors.collectionMethod ? 'input-error' : ''}`}>
                      <option value="">Select method…</option>
                      <option value="CASH">Cash</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                    {errors.collectionMethod && <p className="form-error">{errors.collectionMethod.message}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reference No</label>
                    <input {...register('referenceNo')} className="input" placeholder="Transaction ref, cheque no…" />
                  </div>

                  <div className="form-group sm:col-span-2">
                    <label className="form-label">Notes</label>
                    <textarea {...register('notes')} className="input" rows={2} placeholder="Any notes about this payment…" />
                  </div>

                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-8">
              <button type="submit" disabled={isSubmitting || !loanId} className="btn-primary btn-lg">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Record Payment'}
              </button>
              <button type="button" onClick={() => router.back()} className="btn-secondary btn-lg">Cancel</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

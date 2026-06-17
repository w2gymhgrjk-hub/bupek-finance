'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { repaymentsApi, loansApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loan } from '@/types';

const schema = z.object({
  loanId: z.string().min(1, 'Select a loan'),
  amountReceived: z.number({ coerce: true }).min(0.01, 'Enter amount'),
  paymentDate: z.string().min(1, 'Date required'),
  collectionMethod: z.string().min(1, 'Select method'),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewRepaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preLoanId = searchParams.get('loanId') || '';
  const [loan, setLoan] = useState<Loan | null>(null);
  const [saved, setSaved] = useState<{ receiptNo: string; id: string } | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { loanId: preLoanId, paymentDate: new Date().toISOString().slice(0,10) },
  });
  const loanId = watch('loanId');

  useEffect(() => {
    if (preLoanId) {
      loansApi.getById(preLoanId).then(r => setLoan(r.data.data)).catch(() => {});
    }
  }, [preLoanId]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await repaymentsApi.record(data);
      toast.success(`Payment recorded — Receipt: ${res.data.data.receiptNo}`);
      setSaved({ receiptNo: res.data.data.receiptNo, id: res.data.data.id });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to record repayment');
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="Payment Recorded" />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <div className="card p-10 text-center max-w-md w-full">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful</h2>
            <p className="text-gray-500 text-sm mb-4">Receipt: <span className="font-mono font-bold text-blue-600">{saved.receiptNo}</span></p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push(`/repayments/${saved.id}`)} className="btn-primary">View Receipt</button>
              <button onClick={() => { setSaved(null); }} className="btn-secondary">New Payment</button>
              <button onClick={() => router.push('/repayments')} className="btn-ghost">Back to List</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Record Repayment" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <button onClick={() => router.back()} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>

        {loan && (
          <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-blue-500">Loan</p><p className="font-mono font-bold text-blue-700">{loan.loanNo}</p></div>
              <div><p className="text-xs text-blue-500">Outstanding</p><p className="font-bold text-blue-900">{formatCurrency(loan.outstandingPrincipal)}</p></div>
              <div><p className="text-xs text-blue-500">Status</p><p className="font-medium text-blue-900">{loan.status}</p></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-section">
            <h3 className="section-title">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Loan ID *</label>
                <input {...register('loanId')} className="input font-mono" placeholder="Paste Loan UUID or use the loans list" readOnly={!!preLoanId} />
                {errors.loanId && <p className="text-xs text-red-600 mt-1">{errors.loanId.message}</p>}
              </div>
              <div>
                <label className="label">Amount Received (TZS) *</label>
                <input {...register('amountReceived', { valueAsNumber: true })} type="number" step="100" className="input text-lg font-bold" placeholder="0.00" />
                {errors.amountReceived && <p className="text-xs text-red-600 mt-1">{errors.amountReceived.message}</p>}
              </div>
              <div>
                <label className="label">Payment Date *</label>
                <input {...register('paymentDate')} type="date" className="input" />
                {errors.paymentDate && <p className="text-xs text-red-600 mt-1">{errors.paymentDate.message}</p>}
              </div>
              <div>
                <label className="label">Collection Method *</label>
                <select {...register('collectionMethod')} className="input">
                  <option value="">Select…</option>
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
                {errors.collectionMethod && <p className="text-xs text-red-600 mt-1">{errors.collectionMethod.message}</p>}
              </div>
              <div>
                <label className="label">Reference No</label>
                <input {...register('referenceNo')} className="input" placeholder="Transaction ref, cheque no…" />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea {...register('notes')} className="input" rows={2} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Processing…' : 'Record Payment'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
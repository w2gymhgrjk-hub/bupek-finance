'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Calculator } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { loansApi, clientsApi, loanProductsApi, branchesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Client, LoanProduct, Branch } from '@/types';

const schema = z.object({
  clientId: z.string().min(1, 'Client required'),
  loanProductId: z.string().min(1, 'Product required'),
  principal: z.number({ coerce: true }).min(1000, 'Enter amount'),
  termMonths: z.number({ coerce: true }).min(1, 'Enter term'),
  disbursementDate: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface SchedulePreview {
  installments: Array<{ installmentNo: number; dueDate: string; totalDue: number }>;
  summary: { totalRepayable: number; totalInterest: number; processingFee: number; installmentAmount: number };
}

export default function NewLoanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preClientId = searchParams.get('clientId') || '';

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { clientId: preClientId },
  });

  const [loanProductId, principal, termMonths] = watch(['loanProductId', 'principal', 'termMonths']);

  useEffect(() => {
    Promise.all([clientsApi.list({ limit: 200 }), loanProductsApi.list(), branchesApi.list()]).then(([c, p]) => {
      setClients(c.data.data);
      setProducts(p.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (loanProductId) {
      const prod = products.find(p => p.id === loanProductId) || null;
      setSelectedProduct(prod);
    }
  }, [loanProductId, products]);

  const handlePreview = async () => {
    if (!loanProductId || !principal || !termMonths) return;
    setPreviewing(true);
    try {
      const res = await loansApi.previewSchedule({ loanProductId, principal: Number(principal), termMonths: Number(termMonths) });
      setPreview(res.data.data);
    } catch { toast.error('Preview failed'); }
    setPreviewing(false);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await loansApi.create(data);
      toast.success('Loan application submitted');
      router.push(`/loans/${res.data.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to submit application');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="New Loan Application" />
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
        <button onClick={() => router.back()} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <div className="form-section">
            <h3 className="section-title">Borrower & Product</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Client *</label>
                <select {...register('clientId')} className="input">
                  <option value="">Search & select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.clientNo}</option>)}
                </select>
                {errors.clientId && <p className="text-xs text-red-600 mt-1">{errors.clientId.message}</p>}
              </div>
              <div><label className="label">Loan Product *</label>
                <select {...register('loanProductId')} className="input">
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.interestRate}% {p.interestType === 'FLAT' ? 'flat' : 'reducing'})</option>)}
                </select>
                {errors.loanProductId && <p className="text-xs text-red-600 mt-1">{errors.loanProductId.message}</p>}
              </div>
            </div>
            {selectedProduct && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 grid grid-cols-4 gap-3">
                <span>Rate: {selectedProduct.interestRate}% ({selectedProduct.interestType})</span>
                <span>Term: {selectedProduct.minTerm}–{selectedProduct.maxTerm} {selectedProduct.termUnit}</span>
                <span>Amount: {formatCurrency(selectedProduct.minAmount)}–{formatCurrency(selectedProduct.maxAmount)}</span>
                <span>Freq: {selectedProduct.repaymentFrequency}</span>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="section-title">Loan Terms</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Principal Amount (TZS) *</label>
                <input {...register('principal', { valueAsNumber: true })} type="number" step="1000" className="input" placeholder="e.g. 500000" />
                {errors.principal && <p className="text-xs text-red-600 mt-1">{errors.principal.message}</p>}
              </div>
              <div><label className="label">Term (Months) *</label>
                <input {...register('termMonths', { valueAsNumber: true })} type="number" className="input" placeholder="e.g. 6" />
                {errors.termMonths && <p className="text-xs text-red-600 mt-1">{errors.termMonths.message}</p>}
              </div>
              <div><label className="label">Disbursement Date</label>
                <input {...register('disbursementDate')} type="date" className="input" />
              </div>
              <div><label className="label">Purpose</label>
                <input {...register('purpose')} className="input" placeholder="Business expansion…" />
              </div>
              <div className="col-span-2"><label className="label">Notes</label>
                <textarea {...register('notes')} className="input" rows={2} />
              </div>
            </div>
          </div>

          {/* Schedule Preview */}
          <div className="form-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Repayment Schedule Preview</h3>
              <button type="button" onClick={handlePreview} disabled={previewing} className="btn-secondary text-xs">
                <Calculator className="w-3.5 h-3.5" /> {previewing ? 'Calculating…' : 'Preview Schedule'}
              </button>
            </div>
            {preview && (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    ['Processing Fee', formatCurrency(preview.summary.processingFee)],
                    ['Total Interest', formatCurrency(preview.summary.totalInterest)],
                    ['Total Repayable', formatCurrency(preview.summary.totalRepayable)],
                    ['Installment Amt', formatCurrency(preview.summary.installmentAmount)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{k}</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="table text-xs">
                    <thead><tr><th>#</th><th>Due Date</th><th>Total Due</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {preview.installments.map(i => (
                        <tr key={i.installmentNo}>
                          <td>{i.installmentNo}</td>
                          <td>{i.dueDate}</td>
                          <td>{formatCurrency(i.totalDue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
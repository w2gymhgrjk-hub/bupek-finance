'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Calculator, Loader2, BadgeDollarSign, User, MapPin } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { loansApi, clientsApi, loanProductsApi, branchesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Client, LoanProduct, Branch } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const schema = z.object({
  clientId:            z.string().min(1, 'Client required'),
  loanProductId:       z.string().min(1, 'Loan product required'),
  branchId:            z.string().min(1, 'Branch required'),
  principal:           z.number({ coerce: true }).min(1, 'Enter principal amount'),
  interestRate:        z.number({ coerce: true }).min(0),
  interestType:        z.string().min(1),
  term:                z.number({ coerce: true }).min(1, 'Enter term'),
  termUnit:            z.string().min(1),
  repaymentFrequency:  z.string().min(1),
  gracePeriodDays:     z.number({ coerce: true }).optional(),
  disbursementDate:    z.string().optional(),
  purpose:             z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface SchedulePreview {
  installments: Array<{ installmentNo: number; dueDate: string; principalDue: number; interestDue: number; totalDue: number }>;
  summary: { totalRepayable: number; totalInterest: number; processingFee: number; installmentAmount: number };
}

export default function NewLoanPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const preClientId  = searchParams.get('clientId') || '';
  const { user }     = useAuthStore();

  const [clients,  setClients]  = useState<Client[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);
  const [preview,   setPreview]   = useState<SchedulePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId:           preClientId,
      branchId:           user?.branchId ?? '',
      interestRate:       0,
      interestType:       'FLAT',
      termUnit:           'MONTHS',
      repaymentFrequency: 'MONTHLY',
      gracePeriodDays:    0,
    },
  });

  const [loanProductId, principal, term, termUnit, interestRate, interestType, repaymentFrequency, branchId] =
    watch(['loanProductId', 'principal', 'term', 'termUnit', 'interestRate', 'interestType', 'repaymentFrequency', 'branchId']);

  useEffect(() => {
    Promise.all([
      clientsApi.list({ limit: 500, status: 'ACTIVE' }),
      loanProductsApi.list(),
      branchesApi.list({ limit: 100 }),
    ]).then(([c, p, b]) => {
      setClients(c.data.data ?? []);
      setProducts(p.data.data ?? []);
      setBranches(b.data.data ?? []);
    }).catch(() => toast.error('Failed to load form data'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-fill fields from selected product
  useEffect(() => {
    if (!loanProductId) return;
    const prod = products.find(p => p.id === loanProductId) || null;
    setSelectedProduct(prod);
    if (prod) {
      setValue('interestRate',       Number(prod.interestRate));
      setValue('interestType',       prod.interestType);
      setValue('termUnit',           prod.termUnit);
      setValue('repaymentFrequency', prod.repaymentFrequency);
    }
    setPreview(null);
  }, [loanProductId, products, setValue]);

  const handlePreview = async () => {
    if (!loanProductId || !principal || !term) {
      toast.error('Select product, enter principal and term first');
      return;
    }
    setPreviewing(true);
    try {
      const res = await loansApi.previewSchedule({
        principal:          Number(principal),
        interestRate:       Number(interestRate),
        interestType,
        term:               Number(term),
        termUnit,
        repaymentFrequency,
        disbursementDate:   new Date().toISOString().slice(0, 10),
        gracePeriodDays:    0,
      });
      setPreview(res.data.data);
    } catch { toast.error('Preview failed — check all fields'); }
    setPreviewing(false);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await loansApi.create(data);
      toast.success('Loan application submitted successfully!');
      router.push(`/loans/${res.data.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string; errors?: any[] } } };
      const msg = e.response?.data?.message || e.response?.data?.error || 'Failed to submit application';
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="New Loan Application" subtitle="Submit a loan request" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          <button onClick={() => router.back()} className="btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* ── Borrower & Branch ── */}
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="card-title">Borrower & Branch</h3>
                  </div>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="form-group sm:col-span-2">
                      <label className="form-label">Client <span className="text-red-500">*</span></label>
                      <select {...register('clientId')} className={`input ${errors.clientId ? 'input-error' : ''}`}>
                        <option value="">Select client…</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} — {c.clientNo} — {c.phonePrimary}
                          </option>
                        ))}
                      </select>
                      {errors.clientId && <p className="form-error">{errors.clientId.message}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Branch <span className="text-red-500">*</span></label>
                      <select {...register('branchId')} className={`input ${errors.branchId ? 'input-error' : ''}`}>
                        <option value="">Select branch…</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      {errors.branchId && <p className="form-error">{errors.branchId.message}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Loan Product <span className="text-red-500">*</span></label>
                      <select {...register('loanProductId')} className={`input ${errors.loanProductId ? 'input-error' : ''}`}>
                        <option value="">Select product…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {errors.loanProductId && <p className="form-error">{errors.loanProductId.message}</p>}
                    </div>

                  </div>

                  {selectedProduct && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
                      <span>Rate: <b>{selectedProduct.interestRate}%</b> {selectedProduct.interestType === 'FLAT' ? 'Flat' : 'Reducing'}</span>
                      <span>Term: <b>{selectedProduct.minTerm}–{selectedProduct.maxTerm}</b> {selectedProduct.termUnit}</span>
                      <span>Amount: <b>{formatCurrency(selectedProduct.minAmount)}–{formatCurrency(selectedProduct.maxAmount)}</b></span>
                      <span>Freq: <b>{selectedProduct.repaymentFrequency}</b></span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Loan Terms ── */}
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="card-title">Loan Terms</h3>
                  </div>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="form-group">
                      <label className="form-label">Principal Amount (TZS) <span className="text-red-500">*</span></label>
                      <input {...register('principal', { valueAsNumber: true })} type="number" step="1000" min="1"
                        className={`input ${errors.principal ? 'input-error' : ''}`} placeholder="e.g. 500000" />
                      {errors.principal && <p className="form-error">{errors.principal.message}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Term <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <input {...register('term', { valueAsNumber: true })} type="number" min="1"
                          className={`input flex-1 ${errors.term ? 'input-error' : ''}`} placeholder="e.g. 6" />
                        <select {...register('termUnit')} className="input w-32">
                          <option value="MONTHS">Months</option>
                          <option value="WEEKS">Weeks</option>
                          <option value="DAYS">Days</option>
                        </select>
                      </div>
                      {errors.term && <p className="form-error">{errors.term.message}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Interest Rate (%)</label>
                      <input {...register('interestRate', { valueAsNumber: true })} type="number" step="0.01" min="0"
                        className="input" placeholder="e.g. 15" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Interest Type</label>
                      <select {...register('interestType')} className="input">
                        <option value="FLAT">Flat Rate</option>
                        <option value="REDUCING_BALANCE">Reducing Balance</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Repayment Frequency</label>
                      <select {...register('repaymentFrequency')} className="input">
                        <option value="MONTHLY">Monthly</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="BI_WEEKLY">Bi-Weekly</option>
                        <option value="DAILY">Daily</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Disbursement Date</label>
                      <input {...register('disbursementDate')} type="date" className="input" />
                    </div>

                    <div className="form-group sm:col-span-2">
                      <label className="form-label">Loan Purpose</label>
                      <input {...register('purpose')} className="input" placeholder="e.g. Business expansion, stock purchase…" />
                    </div>

                  </div>
                </div>
              </div>

              {/* ── Schedule Preview ── */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="card-title">Repayment Schedule Preview</h3>
                  </div>
                  <button type="button" onClick={handlePreview} disabled={previewing} className="btn-secondary">
                    {previewing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating…</> : <><Calculator className="w-3.5 h-3.5" /> Preview</>}
                  </button>
                </div>

                {preview ? (
                  <div className="card-body space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        ['Processing Fee',  formatCurrency(preview.summary.processingFee)],
                        ['Total Interest',  formatCurrency(preview.summary.totalInterest)],
                        ['Total Repayable', formatCurrency(preview.summary.totalRepayable)],
                        ['Per Installment', formatCurrency(preview.summary.installmentAmount)],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">{k}</p>
                          <p className="text-sm font-bold text-gray-900">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="data-table text-xs">
                        <thead>
                          <tr><th>#</th><th>Due Date</th><th>Principal</th><th>Interest</th><th>Total Due</th></tr>
                        </thead>
                        <tbody>
                          {preview.installments.slice(0, 12).map(i => (
                            <tr key={i.installmentNo}>
                              <td>{i.installmentNo}</td>
                              <td>{i.dueDate}</td>
                              <td>{formatCurrency(i.principalDue)}</td>
                              <td>{formatCurrency(i.interestDue)}</td>
                              <td className="font-semibold">{formatCurrency(i.totalDue)}</td>
                            </tr>
                          ))}
                          {preview.installments.length > 12 && (
                            <tr><td colSpan={5} className="text-center text-gray-400 py-2">+{preview.installments.length - 12} more installments…</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="card-body">
                    <p className="text-sm text-gray-400 text-center py-4">Fill in the terms above then click Preview to see the repayment schedule.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pb-8">
                <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Application'}
                </button>
                <button type="button" onClick={() => router.back()} className="btn-secondary btn-lg">Cancel</button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}

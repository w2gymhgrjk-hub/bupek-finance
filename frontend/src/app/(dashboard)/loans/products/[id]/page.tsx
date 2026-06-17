'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Edit2, CheckCircle, XCircle, Loader2, BadgeDollarSign, Percent } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { loanProductsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { LoanProduct } from '@/types';
import toast from 'react-hot-toast';

export default function LoanProductDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [product, setProduct] = useState<LoanProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const { register, handleSubmit, reset } = useForm();

  const load = () => {
    setLoading(true);
    loanProductsApi.getById(id)
      .then(r => {
        setProduct(r.data.data);
        reset(r.data.data);
      })
      .catch(() => router.push('/loans/products'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const onSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      await loanProductsApi.update(id, data);
      toast.success('Product updated');
      setEditing(false);
      load();
    } catch { toast.error('Failed to update product'); }
    setSaving(false);
  };

  const toggleStatus = async () => {
    if (!product) return;
    const next = product.status === 'active' ? 'inactive' : 'active';
    try {
      await loanProductsApi.updateStatus(id, next);
      toast.success(`Product ${next === 'active' ? 'activated' : 'deactivated'}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!product) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={product.name} subtitle={`Product Code: ${product.productCode}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Back + actions */}
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn-ghost -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className={`badge ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {product.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER']}>
                <button onClick={toggleStatus}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    product.status === 'active'
                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}>
                  {product.status === 'active' ? <><XCircle className="w-4 h-4" /> Deactivate</> : <><CheckCircle className="w-4 h-4" /> Activate</>}
                </button>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                )}
              </PermissionGuard>
            </div>
          </div>

          {/* Quick stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Interest Rate',  value: `${product.interestRate}%`,            icon: Percent,         color: 'bg-blue-500' },
              { label: 'Interest Type',  value: product.interestType === 'FLAT' ? 'Flat Rate' : 'Reducing Balance', icon: BadgeDollarSign, color: 'bg-purple-500' },
              { label: 'Min Amount',     value: formatCurrency(product.minAmount),      icon: BadgeDollarSign, color: 'bg-emerald-500' },
              { label: 'Max Amount',     value: formatCurrency(product.maxAmount),      icon: BadgeDollarSign, color: 'bg-amber-500' },
            ].map(s => (
              <div key={s.label} className="card flex items-center gap-3 p-4">
                <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center text-white flex-shrink-0`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* View or Edit Form */}
          {!editing ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Loan Terms</h3>
                <dl className="space-y-2.5">
                  {([
                    ['Product Code',     product.productCode],
                    ['Interest Rate',    `${product.interestRate}% (${product.interestType === 'FLAT' ? 'Flat' : 'Reducing Balance'})`],
                    ['Min Term',         `${product.minTerm} ${product.termUnit}`],
                    ['Max Term',         `${product.maxTerm} ${product.termUnit}`],
                    ['Repayment Freq.',  product.repaymentFrequency],
                    ['Grace Period',     `${product.gracePeriodDays ?? 0} days`],
                    ['Requires Guarantor', product.requiresGuarantor ? 'Yes' : 'No'],
                  ] as [string,string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <dt className="text-gray-400">{k}</dt>
                      <dd className="font-medium text-gray-900 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Fees &amp; Charges</h3>
                <dl className="space-y-2.5">
                  {([
                    ['Min Amount',          formatCurrency(product.minAmount)],
                    ['Max Amount',          formatCurrency(product.maxAmount)],
                    ['Processing Fee Type', product.processingFeeType],
                    ['Processing Fee',      `${product.processingFeeValue}${product.processingFeeType === 'PERCENTAGE' ? '%' : ' TZS'}`],
                    ['Penalty Rate',        `${product.penaltyRate ?? 0}% / day`],
                  ] as [string,string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <dt className="text-gray-400">{k}</dt>
                      <dd className="font-medium text-gray-900 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                {product.description && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700">{product.description}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-6">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Edit Product Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 form-group">
                    <label className="form-label">Product Name *</label>
                    <input {...register('name')} className="input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Amount (TZS)</label>
                    <input {...register('minAmount', { valueAsNumber: true })} type="number" className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Amount (TZS)</label>
                    <input {...register('maxAmount', { valueAsNumber: true })} type="number" className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest Rate (%)</label>
                    <input {...register('interestRate', { valueAsNumber: true })} type="number" step="0.01" className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest Type</label>
                    <select {...register('interestType')} className="input">
                      <option value="FLAT">Flat Rate</option>
                      <option value="REDUCING_BALANCE">Reducing Balance</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Term</label>
                    <input {...register('minTerm', { valueAsNumber: true })} type="number" className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Term</label>
                    <input {...register('maxTerm', { valueAsNumber: true })} type="number" className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Term Unit</label>
                    <select {...register('termUnit')} className="input">
                      <option value="MONTHS">Months</option>
                      <option value="WEEKS">Weeks</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Repayment Frequency</label>
                    <select {...register('repaymentFrequency')} className="input">
                      <option value="MONTHLY">Monthly</option>
                      <option value="BIWEEKLY">Bi-weekly</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Processing Fee Type</label>
                    <select {...register('processingFeeType')} className="input">
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Processing Fee Value</label>
                    <input {...register('processingFeeValue', { valueAsNumber: true })} type="number" step="0.01" className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Penalty Rate (%/day)</label>
                    <input {...register('penaltyRate', { valueAsNumber: true })} type="number" step="0.01" className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Grace Period (days)</label>
                    <input {...register('gracePeriodDays', { valueAsNumber: true })} type="number" className="input" />
                  </div>
                  <div className="form-group flex items-center gap-2">
                    <input {...register('requiresGuarantor')} type="checkbox" id="rg" className="rounded w-4 h-4" />
                    <label htmlFor="rg" className="form-label mb-0">Requires Guarantor</label>
                  </div>
                  <div className="col-span-2 form-group">
                    <label className="form-label">Description</label>
                    <textarea {...register('description')} className="input" rows={3} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
                </button>
                <button type="button" onClick={() => { setEditing(false); reset(product); }} className="btn-secondary">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

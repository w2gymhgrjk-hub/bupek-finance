'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import Modal from '@/components/shared/Modal';
import { loanProductsApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { LoanProduct } from '@/types';

export default function LoanProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await loanProductsApi.list(); setProducts(r.data.data); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      await loanProductsApi.create(data);
      toast.success('Product created');
      reset(); setCreateModal(false); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const columns = [
    { key: 'productCode', label: 'Code', render: (p: LoanProduct) => <span className="font-mono text-xs text-blue-600">{p.productCode}</span> },
    { key: 'name', label: 'Product Name' },
    { key: 'interestRate', label: 'Rate', render: (p: LoanProduct) => `${p.interestRate}% (${p.interestType === 'FLAT' ? 'Flat' : 'Reducing'})` },
    { key: 'term', label: 'Term', render: (p: LoanProduct) => `${p.minTerm}–${p.maxTerm} ${p.termUnit}` },
    { key: 'frequency', label: 'Frequency', render: (p: LoanProduct) => p.repaymentFrequency },
    { key: 'status', label: 'Status', render: (p: LoanProduct) => <StatusBadge status={p.status.toUpperCase()} labelMap={{ ACTIVE: 'Active', INACTIVE: 'Inactive' }} /> },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Loan Products" subtitle="Configure lending products" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="page-header">
          <div />
          <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER']}>
            <button onClick={() => setCreateModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Product</button>
          </PermissionGuard>
        </div>
        <DataTable columns={columns as never[]} data={products as never[]} loading={loading}
          onRowClick={(p) => router.push(`/loans/products/${(p as LoanProduct).id}`)} />

        <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Loan Product" size="lg"
          footer={<div className="flex gap-2 justify-end"><button onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button></div>}>
          <form onSubmit={handleSubmit(onSubmit as never)} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Product Name</label>
              <input {...register('name')} className="input" required />
            </div>
            <div>
              <label className="label">Min Amount (TZS)</label>
              <input {...register('minAmount', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Max Amount (TZS)</label>
              <input {...register('maxAmount', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Interest Rate (%)</label>
              <input {...register('interestRate', { valueAsNumber: true })} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Interest Type</label>
              <select {...register('interestType')} className="input">
                <option value="FLAT">Flat Rate</option>
                <option value="REDUCING_BALANCE">Reducing Balance</option>
              </select>
            </div>
            <div>
              <label className="label">Min Term</label>
              <input {...register('minTerm', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Max Term</label>
              <input {...register('maxTerm', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Term Unit</label>
              <select {...register('termUnit')} className="input">
                <option value="MONTHS">Months</option>
                <option value="WEEKS">Weeks</option>
              </select>
            </div>
            <div>
              <label className="label">Repayment Frequency</label>
              <select {...register('repaymentFrequency')} className="input">
                <option value="MONTHLY">Monthly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
            <div>
              <label className="label">Processing Fee Type</label>
              <select {...register('processingFeeType')} className="input">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
            </div>
            <div>
              <label className="label">Processing Fee Value</label>
              <input {...register('processingFeeValue', { valueAsNumber: true })} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Penalty Rate (%/day)</label>
              <input {...register('penaltyRate', { valueAsNumber: true })} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Grace Period (days)</label>
              <input {...register('gracePeriodDays', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input {...register('requiresGuarantor')} type="checkbox" id="rg" className="rounded" />
              <label htmlFor="rg" className="text-sm text-gray-700">Requires Guarantor</label>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea {...register('description')} className="input" rows={2} />
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Creating…' : 'Create Product'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
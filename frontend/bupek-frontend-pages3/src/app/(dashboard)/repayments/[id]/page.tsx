'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, RotateCcw } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Modal from '@/components/shared/Modal';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { repaymentsApi } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Repayment } from '@/types';
import toast from 'react-hot-toast';

export default function RepaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [repayment, setRepayment] = useState<Repayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [reverseModal, setReverseModal] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    repaymentsApi.getById(id).then(r => setRepayment(r.data.data)).catch(() => router.push('/repayments')).finally(() => setLoading(false));
  }, [id]);

  const handleReverse = async () => {
    if (!reversalReason.trim()) { toast.error('Reason required'); return; }
    setReversing(true);
    try {
      await repaymentsApi.reverse(id, reversalReason);
      toast.success('Repayment reversed');
      setReverseModal(false);
      router.refresh();
      repaymentsApi.getById(id).then(r => setRepayment(r.data.data));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Reversal failed');
    }
    setReversing(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>;
  if (!repayment) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={`Receipt ${repayment.receiptNo}`} subtitle="Payment Details" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.back()} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="ml-auto flex gap-2">
            <button onClick={() => window.print()} className="btn-secondary text-xs"><Printer className="w-3.5 h-3.5" /> Print</button>
            {!repayment.isReversed && (
              <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER']}>
                <button onClick={() => setReverseModal(true)} className="btn-danger text-xs"><RotateCcw className="w-3.5 h-3.5" /> Reverse</button>
              </PermissionGuard>
            )}
          </div>
        </div>

        {repayment.isReversed && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3 mb-4">
            ⚠ This repayment has been reversed. It does not affect loan balance.
          </div>
        )}

        {/* Receipt card */}
        <div className="card p-8 mb-6" id="receipt-print">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">BUPEK Finance Limited</h2>
            <p className="text-gray-500 text-sm">Payment Receipt</p>
            <p className="font-mono text-lg font-bold text-blue-600 mt-2">{repayment.receiptNo}</p>
          </div>

          <div className="border-t border-b border-gray-100 py-4 mb-4 space-y-3">
            {[
              ['Client', repayment.client ? `${repayment.client.firstName} ${repayment.client.lastName} (${repayment.client.clientNo})` : '—'],
              ['Loan No', repayment.loan?.loanNo || '—'],
              ['Branch', repayment.branch?.name || '—'],
              ['Payment Date', formatDate(repayment.paymentDate)],
              ['Collection Method', repayment.collectionMethod.replace(/_/g,' ')],
              ['Reference No', repayment.referenceNo || '—'],
              ['Collected By', repayment.collectedBy ? `${repayment.collectedBy.firstName} ${repayment.collectedBy.lastName}` : '—'],
              ['Posted At', formatDateTime(repayment.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {[
              ['Principal Paid', formatCurrency(repayment.principalPaid), 'text-gray-900'],
              ['Interest Paid', formatCurrency(repayment.interestPaid), 'text-gray-900'],
              ['Penalty Paid', formatCurrency(repayment.penaltyPaid), 'text-red-600'],
            ].map(([k, v, cls]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className={`font-medium ${cls}`}>{v}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Total Received</span>
              <span className="text-green-700">{formatCurrency(repayment.amountReceived)}</span>
            </div>
          </div>
        </div>

        {/* Allocations */}
        {repayment.allocations && repayment.allocations.length > 0 && (
          <div className="card p-5">
            <h3 className="section-title">Allocation Breakdown</h3>
            <table className="table">
              <thead><tr><th>Installment</th><th>Due Date</th><th>Principal</th><th>Interest</th><th>Penalty</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {repayment.allocations.map(a => (
                  <tr key={a.id}>
                    <td>#{a.schedule?.installmentNo}</td>
                    <td>{formatDate(a.schedule?.dueDate)}</td>
                    <td>{formatCurrency(a.principalAllocated)}</td>
                    <td>{formatCurrency(a.interestAllocated)}</td>
                    <td>{formatCurrency(a.penaltyAllocated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal open={reverseModal} onClose={() => setReverseModal(false)} title="Reverse Repayment"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={() => setReverseModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReverse} disabled={reversing} className="btn-danger">{reversing ? 'Reversing…' : 'Confirm Reversal'}</button>
          </div>}>
          <div className="space-y-3">
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded">This will restore the loan balance. This action cannot be undone.</p>
            <div>
              <label className="label">Reversal Reason *</label>
              <textarea value={reversalReason} onChange={e => setReversalReason(e.target.value)} className="input" rows={3} placeholder="Explain why…" />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
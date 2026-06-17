'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Modal from '@/components/shared/Modal';
import { collectionsApi, branchesApi } from '@/lib/api';
import { formatCurrency, formatDate, getActivityOutcomeColor } from '@/lib/utils';
import { Branch } from '@/types';
import toast from 'react-hot-toast';

interface OverdueLoan {
  id: string; loanNo: string; daysOverdue: number; arrearsAmount: number; outstandingPrincipal: number;
  client: { id: string; firstName: string; lastName: string; phonePrimary: string };
  branch: { name: string };
  collectionActivities: Array<{ outcome: string; createdAt: string; notes: string }>;
}

export default function CollectionsPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<OverdueLoan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [activityModal, setActivityModal] = useState<OverdueLoan | null>(null);
  const [form, setForm] = useState({ activityType: 'PHONE_CALL', notes: '', outcome: 'UNREACHABLE', promiseToPayDate: '', promiseAmount: '', nextFollowUpDate: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await collectionsApi.getOverdue({ branchId, limit: 50 });
      setLoans(res.data.data || []);
    } catch {}
    setLoading(false);
  }, [branchId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const logActivity = async () => {
    if (!activityModal) return;
    setSubmitting(true);
    try {
      await collectionsApi.logActivity(activityModal.id, { ...form, promiseAmount: form.promiseAmount ? Number(form.promiseAmount) : undefined });
      toast.success('Activity logged'); setActivityModal(null); load();
    } catch { toast.error('Failed'); }
    setSubmitting(false);
  };

  const getBadge = (days: number) => days > 90 ? 'bg-red-200 text-red-900' : days > 30 ? 'bg-red-100 text-red-700' : days > 7 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Collections" subtitle="Overdue loan follow-up" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="page-header">
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input w-44">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <span className="text-sm text-gray-500">{loans.length} overdue loans</span>
        </div>

        <div className="space-y-3">
          {loading ? <div className="text-center text-gray-400 py-12">Loading…</div>
          : loans.map(loan => (
            <div key={loan.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <button onClick={() => router.push(`/loans/${loan.id}`)} className="font-mono text-sm text-blue-600 hover:underline">{loan.loanNo}</button>
                    <span className={`badge ${getBadge(loan.daysOverdue)}`}>{loan.daysOverdue} days overdue</span>
                  </div>
                  <p className="font-medium text-gray-900">{loan.client.firstName} {loan.client.lastName} <span className="text-gray-400 text-sm">· {loan.client.phonePrimary}</span></p>
                  <p className="text-sm text-gray-500 mt-0.5">{loan.branch.name}</p>
                  <div className="flex gap-6 mt-2 text-sm">
                    <span>Arrears: <strong className="text-red-700">{formatCurrency(loan.arrearsAmount)}</strong></span>
                    <span>Outstanding: <strong>{formatCurrency(loan.outstandingPrincipal)}</strong></span>
                  </div>
                  {loan.collectionActivities[0] && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last contact: {formatDate(loan.collectionActivities[0].createdAt)} —
                      <span className={`ml-1 font-medium ${getActivityOutcomeColor(loan.collectionActivities[0].outcome)}`}>{loan.collectionActivities[0].outcome}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button onClick={() => setActivityModal(loan)} className="btn-secondary text-xs"><MessageSquare className="w-3.5 h-3.5" /> Log Activity</button>
                  <button onClick={() => router.push(`/repayments/new?loanId=${loan.id}`)} className="btn-primary text-xs">Record Payment</button>
                </div>
              </div>
            </div>
          ))}
          {!loading && !loans.length && <div className="card p-12 text-center text-gray-400">No overdue loans. 🎉</div>}
        </div>

        {/* Activity Modal */}
        <Modal open={!!activityModal} onClose={() => setActivityModal(null)} title="Log Collection Activity" size="md"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={() => setActivityModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={logActivity} disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : 'Save Activity'}</button>
          </div>}>
          <div className="space-y-4">
            <div><label className="label">Activity Type</label>
              <select value={form.activityType} onChange={e => setForm(f => ({...f, activityType: e.target.value}))} className="input">
                <option value="PHONE_CALL">Phone Call</option>
                <option value="FIELD_VISIT">Field Visit</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="LETTER">Letter</option>
              </select>
            </div>
            <div><label className="label">Outcome</label>
              <select value={form.outcome} onChange={e => setForm(f => ({...f, outcome: e.target.value}))} className="input">
                <option value="PAID">Paid</option>
                <option value="PROMISED">Promised to Pay</option>
                <option value="REFUSED">Refused</option>
                <option value="UNREACHABLE">Unreachable</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div><label className="label">Notes *</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="input" rows={3} />
            </div>
            {form.outcome === 'PROMISED' && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Promise Date</label>
                  <input type="date" value={form.promiseToPayDate} onChange={e => setForm(f => ({...f, promiseToPayDate: e.target.value}))} className="input" />
                </div>
                <div><label className="label">Promise Amount</label>
                  <input type="number" value={form.promiseAmount} onChange={e => setForm(f => ({...f, promiseAmount: e.target.value}))} className="input" />
                </div>
              </div>
            )}
            <div><label className="label">Next Follow-up Date</label>
              <input type="date" value={form.nextFollowUpDate} onChange={e => setForm(f => ({...f, nextFollowUpDate: e.target.value}))} className="input" />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
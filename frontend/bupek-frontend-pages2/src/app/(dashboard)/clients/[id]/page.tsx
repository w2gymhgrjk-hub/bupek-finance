'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, FileText, MapPin, Users, Briefcase, Upload } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import Modal from '@/components/shared/Modal';
import { clientsApi } from '@/lib/api';
import { formatDate, formatCurrency, getLoanStatusColor } from '@/lib/utils';
import { Client, Loan } from '@/types';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'loans' | 'addresses' | 'guarantors' | 'business' | 'documents';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const load = () => {
    setLoading(true);
    clientsApi.getById(id)
      .then(r => setClient(r.data.data))
      .catch(() => router.push('/clients'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async () => {
    try {
      await clientsApi.updateStatus(id, newStatus, statusReason);
      toast.success('Status updated');
      setStatusModal(false);
      load();
    } catch { toast.error('Failed'); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await clientsApi.updatePhoto(id, file); toast.success('Photo updated'); load(); }
    catch { toast.error('Failed to upload photo'); }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await clientsApi.addDocument(id, file, documentType); toast.success('Document uploaded'); load(); }
    catch { toast.error('Upload failed'); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>;
  if (!client) return null;

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'loans', label: `Loans (${client.loans?.length || 0})`, icon: CreditCard },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'guarantors', label: 'Guarantors', icon: Users },
    { id: 'business', label: 'Business', icon: Briefcase },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={`${client.firstName} ${client.lastName}`} subtitle={client.clientNo} />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header actions */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.back()} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="ml-auto flex gap-2">
            <PermissionGuard check={r => !['ACCOUNTANT'].includes(r)}>
              <button onClick={() => router.push(`/clients/${id}/edit`)} className="btn-secondary">Edit</button>
              <button onClick={() => { setNewStatus(client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); setStatusModal(true); }} className="btn-secondary">Change Status</button>
            </PermissionGuard>
            <PermissionGuard check={r => !['ACCOUNTANT'].includes(r)}>
              <button onClick={() => router.push(`/loans/new?clientId=${id}`)} className="btn-primary"><CreditCard className="w-4 h-4" /> Apply for Loan</button>
            </PermissionGuard>
          </div>
        </div>

        {/* Photo + summary bar */}
        <div className="card p-5 mb-6 flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-200">
              {client.photoUrl
                ? <img src={client.photoUrl} alt="photo" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-blue-600">{client.firstName[0]}{client.lastName[0]}</span>
              }
            </div>
            <PermissionGuard check={r => !['ACCOUNTANT'].includes(r)}>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
                <Upload className="w-3 h-3 text-white" />
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </PermissionGuard>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{client.firstName} {client.lastName}</h2>
              <StatusBadge status={client.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{client.clientNo}</span>
              <span>·</span>
              <span>{client.phonePrimary}</span>
              <span>·</span>
              <span>{client.branch?.name}</span>
              {client.loanOfficer && <><span>·</span><span>LO: {client.loanOfficer.firstName} {client.loanOfficer.lastName}</span></>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 gap-1">
          {tabs.map(t => {
            const Icon = t.icon;
            return <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>;
          })}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="section-title">Personal Details</h3>
              <dl className="space-y-3">
                {[
                  ['National ID', client.nationalId],
                  ['Date of Birth', formatDate(client.dateOfBirth)],
                  ['Gender', client.gender || '—'],
                  ['Marital Status', client.maritalStatus || '—'],
                  ['Education', client.educationLevel || '—'],
                  ['Email', client.email || '—'],
                  ['Secondary Phone', client.phoneSecondary || '—'],
                  ['Registered', formatDate(client.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-gray-900 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="card p-6">
              <h3 className="section-title">Loan Summary</h3>
              <dl className="space-y-3">
                {[
                  ['Total Loans', client.loans?.length || 0],
                  ['Active Loans', client.loans?.filter(l => l.status === 'ACTIVE').length || 0],
                  ['Overdue Loans', client.loans?.filter(l => l.status === 'OVERDUE').length || 0],
                  ['Total Disbursed', formatCurrency(client.loans?.reduce((s, l) => s + Number(l.principal), 0) || 0)],
                  ['Outstanding Balance', formatCurrency(client.loans?.filter(l => ['ACTIVE','OVERDUE'].includes(l.status)).reduce((s, l) => s + Number(l.outstandingPrincipal), 0) || 0)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-gray-900 text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {tab === 'loans' && (
          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr>
                <th>Loan No</th><th>Product</th><th>Amount</th><th>Status</th>
                <th>Disbursed</th><th>Maturity</th><th>Outstanding</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {(client.loans || []).map(l => (
                  <tr key={l.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/loans/${l.id}`)}>
                    <td><span className="font-mono text-xs text-blue-600">{l.loanNo}</span></td>
                    <td>{l.loanProduct?.name || '—'}</td>
                    <td>{formatCurrency(l.principal)}</td>
                    <td><span className={`badge ${getLoanStatusColor(l.status)}`}>{l.status}</span></td>
                    <td>{formatDate(l.disbursementDate)}</td>
                    <td>{formatDate(l.maturityDate)}</td>
                    <td>{formatCurrency(l.outstandingPrincipal)}</td>
                  </tr>
                ))}
                {!client.loans?.length && <tr><td colSpan={7} className="text-center text-gray-400 py-8 text-sm">No loans</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'addresses' && (
          <div className="space-y-4">
            {(client.addresses || []).map(a => (
              <div key={a.id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge bg-blue-50 text-blue-700">{a.addressType}</span>
                  {a.isPrimary && <span className="badge bg-green-50 text-green-700">Primary</span>}
                </div>
                <p className="text-sm text-gray-700">{a.streetAddress}, {a.city}, {a.district}, {a.region}</p>
              </div>
            ))}
            {!client.addresses?.length && <p className="text-gray-400 text-sm">No addresses recorded.</p>}
          </div>
        )}

        {tab === 'guarantors' && (
          <div className="space-y-4">
            {(client.guarantors || []).map(g => (
              <div key={g.id} className="card p-5">
                <p className="font-medium text-gray-900">{g.firstName} {g.lastName}</p>
                <p className="text-sm text-gray-500 mt-1">{g.nationalId} · {g.phone} · {g.relationship}</p>
              </div>
            ))}
            {!client.guarantors?.length && <p className="text-gray-400 text-sm">No guarantors on record.</p>}
          </div>
        )}

        {tab === 'business' && (
          client.business
            ? <div className="card p-6 max-w-lg">
              <h3 className="section-title">Business Information</h3>
              <dl className="space-y-3">
                {[
                  ['Business Name', client.business.businessName],
                  ['Type', client.business.businessType],
                  ['Address', client.business.address],
                  ['Years Operating', client.business.yearsInOperation ?? '—'],
                  ['Monthly Revenue', formatCurrency(client.business.monthlyRevenue || 0)],
                  ['Monthly Expenses', formatCurrency(client.business.monthlyExpenses || 0)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-gray-900">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            : <p className="text-gray-400 text-sm">No business information.</p>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            <PermissionGuard check={r => !['ACCOUNTANT'].includes(r)}>
              <div className="card p-4 border-dashed border-2">
                <label className="flex flex-col items-center gap-2 cursor-pointer text-gray-500 hover:text-blue-600">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Upload Document</span>
                  <select className="input mt-2 w-48" id="docType">
                    <option value="NATIONAL_ID">National ID</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="BUSINESS_LICENSE">Business License</option>
                    <option value="UTILITY_BILL">Utility Bill</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                    onChange={e => { const sel = document.getElementById('docType') as HTMLSelectElement; handleDocUpload(e, sel.value); }} />
                </label>
              </div>
            </PermissionGuard>
            {(client.documents || []).map(d => (
              <div key={d.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.documentName}</p>
                  <p className="text-xs text-gray-500">{d.documentType} · {formatDate(d.uploadedAt)}</p>
                </div>
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">View</a>
              </div>
            ))}
            {!client.documents?.length && <p className="text-gray-400 text-sm mt-4">No documents uploaded.</p>}
          </div>
        )}

        {/* Status change modal */}
        <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Change Client Status"
          footer={<div className="flex gap-2 justify-end">
            <button onClick={() => setStatusModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleStatusChange} className="btn-primary">Confirm</button>
          </div>}>
          <div className="space-y-4">
            <div>
              <label className="label">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>
            <div>
              <label className="label">Reason</label>
              <textarea value={statusReason} onChange={e => setStatusReason(e.target.value)}
                className="input" rows={3} placeholder="Explain the reason…" />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
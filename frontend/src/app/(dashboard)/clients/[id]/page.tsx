'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CreditCard, FileText, MapPin, Users, Briefcase,
  Upload, Edit2, UserX, UserCheck, CheckCircle, XCircle,
  ThumbsUp, Banknote, ChevronDown, ChevronUp, Loader2, Plus, Trash2, Building2
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/shared/StatusBadge';
import PermissionGuard from '@/components/shared/PermissionGuard';
import Modal from '@/components/shared/Modal';
import { clientsApi } from '@/lib/api';
import { formatDate, formatCurrency, getLoanStatusColor } from '@/lib/utils';
import { Client } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@/lib/permissions';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'loans' | 'addresses' | 'guarantors' | 'business' | 'documents';

const ACTION_STYLES: Record<string, string> = {
  SUBMITTED:   'bg-blue-500',
  RECOMMENDED: 'bg-purple-500',
  APPROVED:    'bg-emerald-500',
  DISBURSED:   'bg-teal-500',
  REJECTED:    'bg-red-500',
  WRITTEN_OFF: 'bg-gray-500',
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  SUBMITTED:   FileText,
  RECOMMENDED: ThumbsUp,
  APPROVED:    CheckCircle,
  DISBURSED:   Banknote,
  REJECTED:    XCircle,
  WRITTEN_OFF: XCircle,
};

function LoanWorkflowRow({ loan }: { loan: any }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const lastStep = loan.workflow?.[loan.workflow.length - 1];
  const recommends = loan.workflow?.filter((w: any) => w.action === 'RECOMMENDED') ?? [];
  const approvals  = loan.workflow?.filter((w: any) => w.action === 'APPROVED') ?? [];

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
        <button className="flex-1 flex items-center gap-3 text-left" onClick={() => router.push(`/loans/${loan.id}`)}>
          <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {loan.loanNo}
          </span>
          <span className="text-sm font-medium text-gray-700">{loan.loanProduct?.name || '—'}</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(loan.principal)}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLoanStatusColor(loan.status)}`}>
            {loan.status.replace(/_/g,' ')}
          </span>
          {loan.maturityDate && (
            <span className="text-xs text-gray-400 hidden md:inline">Maturity: {formatDate(loan.maturityDate)}</span>
          )}
        </button>

        {/* Mini workflow indicators */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(loan.workflow ?? []).map((w: any) => {
            const Icon = ACTION_ICONS[w.action] ?? FileText;
            return (
              <div key={w.id} title={`${w.action} by ${w.actor?.firstName} ${w.actor?.lastName}`}
                className={`w-5 h-5 rounded-full ${ACTION_STYLES[w.action] ?? 'bg-gray-400'} flex items-center justify-center`}>
                <Icon className="w-2.5 h-2.5 text-white" />
              </div>
            );
          })}
        </div>

        <button onClick={() => setExpanded(e => !e)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded workflow timeline */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Loan Workflow History</p>
          {!loan.workflow?.length ? (
            <p className="text-sm text-gray-400">No workflow history.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-3">
                {loan.workflow.map((w: any, i: number) => {
                  const Icon = ACTION_ICONS[w.action] ?? FileText;
                  const isGood = ['SUBMITTED','RECOMMENDED','APPROVED','DISBURSED'].includes(w.action);
                  const isBad  = ['REJECTED','WRITTEN_OFF'].includes(w.action);
                  return (
                    <div key={w.id} className="relative flex items-start gap-3 pl-8">
                      <div className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                        isBad ? 'bg-red-500' : isGood ? ACTION_STYLES[w.action] : 'bg-gray-400'
                      }`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 bg-white rounded-lg border border-gray-100 px-3 py-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${isBad ? 'text-red-600' : isGood ? 'text-emerald-700' : 'text-blue-600'}`}>
                            {w.action.replace(/_/g,' ')}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(w.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          <span className="font-medium">{w.actor?.firstName} {w.actor?.lastName}</span>
                          <span className="text-gray-400"> · {(w.actor?.role ?? w.actorRole ?? '').replace(/_/g,' ')}</span>
                        </p>
                        {w.notes && (
                          <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 rounded px-2 py-1 border-l-2 border-gray-200">
                            "{w.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outstanding balance summary */}
          {['ACTIVE','OVERDUE'].includes(loan.status) && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-500">Outstanding balance:</span>
              <span className="font-bold text-red-600">{formatCurrency(loan.outstandingPrincipal)}</span>
            </div>
          )}
          {loan.status === 'REJECTED' && loan.rejectionReason && (
            <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700 border border-red-100">
              <span className="font-semibold">Rejection reason:</span> {loan.rejectionReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user: me } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('overview');
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus]     = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [docType, setDocType] = useState('NATIONAL_ID');
  const [docUploading, setDocUploading] = useState(false);

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressForm, setAddressForm] = useState({
    addressType: 'HOME', streetAddress: '', city: '', district: '', region: '', isPrimary: false,
  });

  // Guarantor form state
  const [showGuarantorForm, setShowGuarantorForm] = useState(false);
  const [guarantorSaving, setGuarantorSaving] = useState(false);
  const [guarantorForm, setGuarantorForm] = useState({
    firstName: '', lastName: '', phone: '', nationalId: '', relationship: '', occupation: '', address: '',
  });

  // Business form state
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    businessName: '', businessType: '', registrationNo: '', address: '',
    yearsInOperation: '', monthlyRevenue: '', monthlyExpenses: '', numberOfEmployees: '',
  });

  const load = () => {
    setLoading(true);
    clientsApi.getById(id)
      .then(r => setClient(r.data.data))
      .catch(() => router.push('/clients'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async () => {
    setStatusLoading(true);
    try {
      await clientsApi.updateStatus(id, newStatus, statusReason);
      toast.success(`Client ${newStatus === 'ACTIVE' ? 'activated' : newStatus === 'BLACKLISTED' ? 'blacklisted' : 'deactivated'}`);
      setStatusModal(false);
      setStatusReason('');
      load();
    } catch { toast.error('Failed to update status'); }
    setStatusLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { await clientsApi.updatePhoto(id, file); toast.success('Photo updated'); load(); }
    catch { toast.error('Failed to upload photo'); }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setDocUploading(true);
    try {
      await clientsApi.addDocument(id, file, docType);
      toast.success('Document uploaded successfully');
      e.target.value = '';
      load();
    } catch { toast.error('Upload failed — check file type and size'); }
    setDocUploading(false);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSaving(true);
    try {
      await clientsApi.addAddress(id, addressForm as any);
      toast.success('Address added');
      setShowAddressForm(false);
      setAddressForm({ addressType: 'HOME', streetAddress: '', city: '', district: '', region: '', isPrimary: false });
      load();
    } catch { toast.error('Failed to add address'); }
    setAddressSaving(false);
  };

  const handleAddGuarantor = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuarantorSaving(true);
    try {
      await clientsApi.addGuarantor(id, guarantorForm as any);
      toast.success('Guarantor added');
      setShowGuarantorForm(false);
      setGuarantorForm({ firstName: '', lastName: '', phone: '', nationalId: '', relationship: '', occupation: '', address: '' });
      load();
    } catch { toast.error('Failed to add guarantor'); }
    setGuarantorSaving(false);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSaving(true);
    try {
      await clientsApi.upsertBusiness(id, {
        ...businessForm,
        yearsInOperation: businessForm.yearsInOperation ? Number(businessForm.yearsInOperation) : undefined,
        monthlyRevenue:   businessForm.monthlyRevenue   ? Number(businessForm.monthlyRevenue)   : undefined,
        monthlyExpenses:  businessForm.monthlyExpenses  ? Number(businessForm.monthlyExpenses)  : undefined,
        numberOfEmployees:businessForm.numberOfEmployees? Number(businessForm.numberOfEmployees): undefined,
      });
      toast.success('Business information saved');
      setEditingBusiness(false);
      load();
    } catch { toast.error('Failed to save business info'); }
    setBusinessSaving(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="spinner-lg" /></div>;
  if (!client) return null;

  const loans      = (client as any).loans ?? [];
  const canManage  = me?.role && PERMISSIONS.canManageClients(me.role);
  const canStatus  = me?.role && ['CEO_ADMIN','OPERATIONS_MANAGER','BRANCH_MANAGER'].includes(me.role);

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview',   label: 'Overview',                     icon: Users },
    { id: 'loans',      label: `Loans (${loans.length})`,      icon: CreditCard },
    { id: 'addresses',  label: 'Addresses',                    icon: MapPin },
    { id: 'guarantors', label: 'Guarantors',                   icon: Users },
    { id: 'business',   label: 'Business',                     icon: Briefcase },
    { id: 'documents',  label: 'Documents',                    icon: FileText },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={`${client.firstName} ${client.lastName}`} subtitle={client.clientNo} />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => router.back()} className="btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {canManage && (
              <button onClick={() => router.push(`/clients/${id}/edit`)} className="btn-secondary text-sm">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
            {canStatus && (
              client.status === 'ACTIVE' ? (
                <button onClick={() => { setNewStatus('INACTIVE'); setStatusModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 border border-red-200 transition-colors">
                  <UserX className="w-4 h-4" /> Deactivate
                </button>
              ) : (
                <button onClick={() => { setNewStatus('ACTIVE'); setStatusModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 border border-emerald-200 transition-colors">
                  <UserCheck className="w-4 h-4" /> Activate
                </button>
              )
            )}
            {canStatus && client.status === 'ACTIVE' && (
              <button onClick={() => { setNewStatus('BLACKLISTED'); setStatusModal(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                <XCircle className="w-4 h-4" /> Blacklist
              </button>
            )}
            {canManage && (
              <button onClick={() => router.push(`/loans/new?clientId=${id}`)} className="btn-primary text-sm">
                <CreditCard className="w-4 h-4" /> Apply for Loan
              </button>
            )}
          </div>
        </div>

        {/* ── Profile Card ── */}
        <div className="card p-5 mb-5 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center overflow-hidden border-3 border-blue-100 shadow">
              {client.photoUrl
                ? <img src={client.photoUrl} alt="photo" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-white">{client.firstName[0]}{client.lastName[0]}</span>
              }
            </div>
            {canManage && (
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow">
                <Upload className="w-3 h-3 text-white" />
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{client.firstName} {client.lastName}</h2>
              <StatusBadge status={client.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{client.clientNo}</span>
              <span>{client.phonePrimary}</span>
              {client.email && <span>{client.email}</span>}
              {(client as any).branch && <span>📍 {(client as any).branch.name}</span>}
              {(client as any).loanOfficer && (
                <span>👤 LO: {(client as any).loanOfficer.firstName} {(client as any).loanOfficer.lastName}</span>
              )}
            </div>
          </div>
          {/* Quick loan stats */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{loans.length}</p>
              <p className="text-xs text-gray-400">Total Loans</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{loans.filter((l: any) => l.status === 'ACTIVE').length}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{loans.filter((l: any) => l.status === 'OVERDUE').length}</p>
              <p className="text-xs text-gray-400">Overdue</p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 mb-5 gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Personal Details</h3>
              <dl className="space-y-2.5">
                {([
                  ['National ID',      client.nationalId || '—'],
                  ['Date of Birth',    formatDate((client as any).dateOfBirth)],
                  ['Gender',           (client as any).gender || '—'],
                  ['Marital Status',   (client as any).maritalStatus || '—'],
                  ['Education',        (client as any).educationLevel || '—'],
                  ['Secondary Phone',  (client as any).phoneSecondary || '—'],
                  ['Registered',       formatDate(client.createdAt)],
                ] as [string,string][]).map(([k,v]) => (
                  <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                    <dt className="text-gray-400">{k}</dt>
                    <dd className="font-medium text-gray-900 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Loan Portfolio Summary</h3>
              <dl className="space-y-2.5">
                {([
                  ['Total Loans',           loans.length],
                  ['Active Loans',          loans.filter((l: any) => l.status === 'ACTIVE').length],
                  ['Overdue Loans',         loans.filter((l: any) => l.status === 'OVERDUE').length],
                  ['Total Disbursed',       formatCurrency(loans.reduce((s: number, l: any) => s + Number(l.principal ?? 0), 0))],
                  ['Total Paid',            formatCurrency(loans.reduce((s: number, l: any) => s + Number(l.totalPaid ?? 0), 0))],
                  ['Outstanding Balance',   formatCurrency(loans.filter((l: any) => ['ACTIVE','OVERDUE'].includes(l.status)).reduce((s: number, l: any) => s + Number(l.outstandingPrincipal ?? 0), 0))],
                ] as [string, string|number][]).map(([k,v]) => (
                  <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                    <dt className="text-gray-400">{k}</dt>
                    <dd className="font-medium text-gray-900 text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {(client as any).notes && (
              <div className="card p-5 md:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
                <p className="text-sm text-gray-600 italic">{(client as any).notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Loans (with workflow) ── */}
        {tab === 'loans' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">
                {loans.length} loan{loans.length !== 1 ? 's' : ''} — click <ChevronDown className="w-3.5 h-3.5 inline" /> to see recommendation &amp; approval history
              </h3>
              {canManage && (
                <button onClick={() => router.push(`/loans/new?clientId=${id}`)} className="btn-primary text-sm">
                  <CreditCard className="w-4 h-4" /> New Loan Application
                </button>
              )}
            </div>

            {loans.length === 0 ? (
              <div className="card py-12 text-center">
                <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No loans yet for this client.</p>
                {canManage && (
                  <button onClick={() => router.push(`/loans/new?clientId=${id}`)} className="btn-primary mt-3 text-sm">
                    Apply for Loan
                  </button>
                )}
              </div>
            ) : (
              <div>
                {loans.map((loan: any) => (
                  <LoanWorkflowRow key={loan.id} loan={loan} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Addresses ── */}
        {tab === 'addresses' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Client Addresses</h3>
              {canManage && !showAddressForm && (
                <button onClick={() => setShowAddressForm(true)} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              )}
            </div>

            {/* Add address form */}
            {showAddressForm && (
              <div className="card p-5 border-2 border-blue-100">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" /> New Address
                </h4>
                <form onSubmit={handleAddAddress}>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="form-group">
                      <label className="form-label">Address Type</label>
                      <select value={addressForm.addressType}
                        onChange={e => setAddressForm(f => ({ ...f, addressType: e.target.value }))}
                        className="input">
                        <option value="HOME">Home</option>
                        <option value="WORK">Work</option>
                        <option value="BUSINESS">Business</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="form-group flex items-end gap-2">
                      <input type="checkbox" id="isPrimary" checked={addressForm.isPrimary}
                        onChange={e => setAddressForm(f => ({ ...f, isPrimary: e.target.checked }))}
                        className="w-4 h-4 rounded" />
                      <label htmlFor="isPrimary" className="form-label mb-0">Set as primary</label>
                    </div>
                    <div className="col-span-2 form-group">
                      <label className="form-label">Street Address</label>
                      <input value={addressForm.streetAddress} required
                        onChange={e => setAddressForm(f => ({ ...f, streetAddress: e.target.value }))}
                        className="input" placeholder="e.g. 123 Uhuru Street" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City / Town</label>
                      <input value={addressForm.city} required
                        onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))}
                        className="input" placeholder="e.g. Dar es Salaam" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">District</label>
                      <input value={addressForm.district}
                        onChange={e => setAddressForm(f => ({ ...f, district: e.target.value }))}
                        className="input" placeholder="e.g. Kinondoni" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Region</label>
                      <input value={addressForm.region}
                        onChange={e => setAddressForm(f => ({ ...f, region: e.target.value }))}
                        className="input" placeholder="e.g. Dar es Salaam" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={addressSaving} className="btn-primary">
                      {addressSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Address'}
                    </button>
                    <button type="button" onClick={() => setShowAddressForm(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Existing addresses */}
            {((client as any).addresses ?? []).length === 0 && !showAddressForm ? (
              <div className="card py-12 text-center">
                <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No addresses recorded yet.</p>
                {canManage && (
                  <button onClick={() => setShowAddressForm(true)} className="btn-primary mt-3 text-sm">
                    <Plus className="w-4 h-4" /> Add Address
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {((client as any).addresses ?? []).map((a: any) => (
                  <div key={a.id} className="card p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge bg-blue-50 text-blue-700 text-xs">{a.addressType}</span>
                        {a.isPrimary && <span className="badge bg-emerald-50 text-emerald-700 text-xs">Primary</span>}
                      </div>
                      <p className="text-sm text-gray-700">
                        {[a.streetAddress, a.city, a.district, a.region].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Guarantors ── */}
        {tab === 'guarantors' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Guarantors</h3>
              {canManage && !showGuarantorForm && (
                <button onClick={() => setShowGuarantorForm(true)} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Add Guarantor
                </button>
              )}
            </div>

            {/* Add guarantor form */}
            {showGuarantorForm && (
              <div className="card p-5 border-2 border-blue-100">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> New Guarantor
                </h4>
                <form onSubmit={handleAddGuarantor}>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input value={guarantorForm.firstName} required
                        onChange={e => setGuarantorForm(f => ({ ...f, firstName: e.target.value }))}
                        className="input" placeholder="e.g. John" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input value={guarantorForm.lastName} required
                        onChange={e => setGuarantorForm(f => ({ ...f, lastName: e.target.value }))}
                        className="input" placeholder="e.g. Doe" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input value={guarantorForm.phone} required
                        onChange={e => setGuarantorForm(f => ({ ...f, phone: e.target.value }))}
                        className="input" placeholder="e.g. 0712345678" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">National ID</label>
                      <input value={guarantorForm.nationalId}
                        onChange={e => setGuarantorForm(f => ({ ...f, nationalId: e.target.value }))}
                        className="input" placeholder="ID number" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Relationship</label>
                      <select value={guarantorForm.relationship}
                        onChange={e => setGuarantorForm(f => ({ ...f, relationship: e.target.value }))}
                        className="input">
                        <option value="">— Select —</option>
                        <option value="SPOUSE">Spouse</option>
                        <option value="PARENT">Parent</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="FRIEND">Friend</option>
                        <option value="COLLEAGUE">Colleague</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Occupation</label>
                      <input value={guarantorForm.occupation}
                        onChange={e => setGuarantorForm(f => ({ ...f, occupation: e.target.value }))}
                        className="input" placeholder="e.g. Teacher" />
                    </div>
                    <div className="col-span-2 form-group">
                      <label className="form-label">Address</label>
                      <input value={guarantorForm.address}
                        onChange={e => setGuarantorForm(f => ({ ...f, address: e.target.value }))}
                        className="input" placeholder="Physical address" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={guarantorSaving} className="btn-primary">
                      {guarantorSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Guarantor'}
                    </button>
                    <button type="button" onClick={() => setShowGuarantorForm(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Existing guarantors */}
            {((client as any).guarantors ?? []).length === 0 && !showGuarantorForm ? (
              <div className="card py-12 text-center">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No guarantors recorded yet.</p>
                {canManage && (
                  <button onClick={() => setShowGuarantorForm(true)} className="btn-primary mt-3 text-sm">
                    <Plus className="w-4 h-4" /> Add Guarantor
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {((client as any).guarantors ?? []).map((g: any) => (
                  <div key={g.id} className="card p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center font-bold text-purple-600 text-sm flex-shrink-0">
                      {g.firstName?.[0]}{g.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{g.firstName} {g.lastName}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                        {g.relationship && <span className="badge bg-purple-50 text-purple-700 text-xs">{g.relationship}</span>}
                        {g.phone && <span>📞 {g.phone}</span>}
                        {g.nationalId && <span>🪪 {g.nationalId}</span>}
                        {g.occupation && <span>💼 {g.occupation}</span>}
                      </div>
                      {g.address && <p className="text-xs text-gray-400 mt-1">📍 {g.address}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Business ── */}
        {tab === 'business' && (
          <div className="space-y-4 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Business Information</h3>
              {canManage && !editingBusiness && (
                <button
                  onClick={() => {
                    const b = (client as any).business;
                    if (b) setBusinessForm({
                      businessName: b.businessName || '', businessType: b.businessType || '',
                      registrationNo: b.registrationNo || '', address: b.address || '',
                      yearsInOperation: String(b.yearsInOperation || ''),
                      monthlyRevenue: String(b.monthlyRevenue || ''),
                      monthlyExpenses: String(b.monthlyExpenses || ''),
                      numberOfEmployees: String(b.numberOfEmployees || ''),
                    });
                    setEditingBusiness(true);
                  }}
                  className="btn-secondary text-sm">
                  <Edit2 className="w-4 h-4" /> {(client as any).business ? 'Edit' : 'Add Business Info'}
                </button>
              )}
            </div>

            {/* Business form */}
            {editingBusiness && (
              <div className="card p-5 border-2 border-blue-100">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" /> Business Details
                </h4>
                <form onSubmit={handleSaveBusiness}>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="form-group">
                      <label className="form-label">Business Name</label>
                      <input value={businessForm.businessName}
                        onChange={e => setBusinessForm(f => ({ ...f, businessName: e.target.value }))}
                        className="input" placeholder="e.g. Mama Pima Supplies" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business Type</label>
                      <select value={businessForm.businessType}
                        onChange={e => setBusinessForm(f => ({ ...f, businessType: e.target.value }))}
                        className="input">
                        <option value="">— Select —</option>
                        <option value="RETAIL">Retail / Shop</option>
                        <option value="WHOLESALE">Wholesale</option>
                        <option value="AGRICULTURE">Agriculture / Farming</option>
                        <option value="MANUFACTURING">Manufacturing</option>
                        <option value="SERVICES">Services</option>
                        <option value="TRANSPORT">Transport / Logistics</option>
                        <option value="FOOD_BEVERAGES">Food & Beverages</option>
                        <option value="SALON">Salon / Beauty</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Registration No.</label>
                      <input value={businessForm.registrationNo}
                        onChange={e => setBusinessForm(f => ({ ...f, registrationNo: e.target.value }))}
                        className="input" placeholder="Business reg. no." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Years in Operation</label>
                      <input type="number" value={businessForm.yearsInOperation} min="0"
                        onChange={e => setBusinessForm(f => ({ ...f, yearsInOperation: e.target.value }))}
                        className="input" placeholder="e.g. 3" />
                    </div>
                    <div className="col-span-2 form-group">
                      <label className="form-label">Business Address</label>
                      <input value={businessForm.address}
                        onChange={e => setBusinessForm(f => ({ ...f, address: e.target.value }))}
                        className="input" placeholder="e.g. Kariakoo Market, Dar es Salaam" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Monthly Revenue (TZS)</label>
                      <input type="number" value={businessForm.monthlyRevenue} min="0"
                        onChange={e => setBusinessForm(f => ({ ...f, monthlyRevenue: e.target.value }))}
                        className="input" placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Monthly Expenses (TZS)</label>
                      <input type="number" value={businessForm.monthlyExpenses} min="0"
                        onChange={e => setBusinessForm(f => ({ ...f, monthlyExpenses: e.target.value }))}
                        className="input" placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. of Employees</label>
                      <input type="number" value={businessForm.numberOfEmployees} min="0"
                        onChange={e => setBusinessForm(f => ({ ...f, numberOfEmployees: e.target.value }))}
                        className="input" placeholder="0" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={businessSaving} className="btn-primary">
                      {businessSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Business Info'}
                    </button>
                    <button type="button" onClick={() => setEditingBusiness(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Business view */}
            {!editingBusiness && (
              (client as any).business ? (
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{(client as any).business.businessName || '—'}</p>
                      <p className="text-xs text-gray-400">{(client as any).business.businessType || '—'}</p>
                    </div>
                  </div>
                  <dl className="space-y-2.5">
                    {([
                      ['Registration No.',  (client as any).business.registrationNo || '—'],
                      ['Address',           (client as any).business.address || '—'],
                      ['Years Operating',   (client as any).business.yearsInOperation != null ? `${(client as any).business.yearsInOperation} years` : '—'],
                      ['No. of Employees',  (client as any).business.numberOfEmployees ?? '—'],
                      ['Monthly Revenue',   formatCurrency((client as any).business.monthlyRevenue || 0)],
                      ['Monthly Expenses',  formatCurrency((client as any).business.monthlyExpenses || 0)],
                      ['Monthly Profit',    formatCurrency(((client as any).business.monthlyRevenue || 0) - ((client as any).business.monthlyExpenses || 0))],
                    ] as [string,string][]).map(([k,v]) => (
                      <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                        <dt className="text-gray-400">{k}</dt>
                        <dd className="font-medium text-gray-900 text-right">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <div className="card py-12 text-center">
                  <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No business information recorded.</p>
                  {canManage && (
                    <button onClick={() => setEditingBusiness(true)} className="btn-primary mt-3 text-sm">
                      <Plus className="w-4 h-4" /> Add Business Info
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* ── Tab: Documents ── */}
        {tab === 'documents' && (
          <div className="space-y-4">
            {/* Upload area */}
            {canManage && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-500" /> Upload Client Document
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="form-group">
                    <label className="form-label">Document Type</label>
                    <select value={docType} onChange={e => setDocType(e.target.value)} className="input">
                      <option value="NATIONAL_ID">National ID</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="VOTERS_ID">Voter's ID</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="BUSINESS_LICENSE">Business License</option>
                      <option value="UTILITY_BILL">Utility Bill</option>
                      <option value="BANK_STATEMENT">Bank Statement</option>
                      <option value="PAYSLIP">Payslip</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">File <span className="text-gray-400 font-normal">(PDF, JPG, PNG — max 5MB)</span></label>
                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      docUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      {docUploading
                        ? <><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /><span className="text-sm text-blue-600">Uploading…</span></>
                        : <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">Click to choose file</span></>
                      }
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        disabled={docUploading} onChange={handleDocUpload} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Documents list */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Uploaded Documents</h3>
                <span className="text-sm text-gray-400">{((client as any).documents ?? []).length} file(s)</span>
              </div>
              {!((client as any).documents?.length) ? (
                <div className="py-12 text-center">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
                  {canManage && <p className="text-gray-300 text-xs mt-1">Use the upload area above to add IDs, passports, or other files.</p>}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {((client as any).documents ?? []).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.documentName || d.documentType}</p>
                        <p className="text-xs text-gray-400">{d.documentType.replace(/_/g,' ')} · Uploaded {formatDate(d.uploadedAt)}</p>
                      </div>
                      <a href={`http://localhost:5000${d.fileUrl}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors">
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Status Change Modal (Deactivate / Activate / Blacklist) ── */}
        <Modal
          open={statusModal}
          onClose={() => { setStatusModal(false); setStatusReason(''); }}
          title={
            newStatus === 'ACTIVE'      ? 'Activate Client' :
            newStatus === 'BLACKLISTED' ? 'Blacklist Client' :
                                          'Deactivate Client'
          }
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setStatusModal(false); setStatusReason(''); }}
                className="btn-secondary" disabled={statusLoading}>Cancel</button>
              <button onClick={handleStatusChange} disabled={statusLoading}
                className={newStatus === 'ACTIVE' ? 'btn-primary' : 'btn-danger'}>
                {statusLoading ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                {client.firstName[0]}{client.lastName[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{client.firstName} {client.lastName}</p>
                <p className="text-sm text-gray-500">{client.clientNo} · Current status: <strong>{client.status}</strong></p>
              </div>
            </div>

            {newStatus === 'BLACKLISTED' && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
                ⚠ Blacklisting prevents this client from taking any new loans in the system.
              </div>
            )}

            <div>
              <label className="form-label">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea value={statusReason} onChange={e => setStatusReason(e.target.value)}
                className="input" rows={3}
                placeholder={
                  newStatus === 'ACTIVE'      ? 'Reason for reactivating this client…' :
                  newStatus === 'BLACKLISTED' ? 'Reason for blacklisting (fraud, default, etc.)…' :
                  'Reason for deactivating this client…'
                } />
            </div>

            <p className="text-xs text-gray-400">
              Note: Clients can only be deactivated or blacklisted — not deleted. All records are permanently retained.
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
}

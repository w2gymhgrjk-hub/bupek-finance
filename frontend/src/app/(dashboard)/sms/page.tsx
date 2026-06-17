'use client';
import { useEffect, useState, useCallback } from 'react';
import { Send, Settings, List } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Modal from '@/components/shared/Modal';
import PermissionGuard from '@/components/shared/PermissionGuard';
import DataTable from '@/components/shared/DataTable';
import { smsApi, clientsApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { SmsTemplate, SmsLog, Client, PaginationMeta } from '@/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

type Tab = 'logs' | 'templates' | 'send';

export default function SmsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('logs');
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logMeta, setLogMeta] = useState<PaginationMeta | undefined>();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendForm, setSendForm] = useState({ clientId: '', message: '', templateId: '' });
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await smsApi.getLogs({ page, limit: 20 });
      setLogs(res.data.data); setLogMeta(res.data.meta);
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => {
    smsApi.getTemplates().then(r => setTemplates(r.data.data || [])).catch(() => {});
    clientsApi.list({ limit: 200 }).then(r => setClients(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);

  const handleSend = async () => {
    if (!sendForm.clientId || !sendForm.message) { toast.error('Client and message required'); return; }
    setSending(true);
    try {
      await smsApi.send(sendForm);
      toast.success('SMS sent');
      setSendForm({ clientId: '', message: '', templateId: '' });
    } catch { toast.error('Failed to send SMS'); }
    setSending(false);
  };

  const handleTemplateSelect = (tid: string) => {
    const t = templates.find(t => t.id === tid);
    if (t) setSendForm(f => ({ ...f, templateId: tid, message: t.messageTemplate }));
  };

  const logCols = [
    { key: 'template', label: 'Template', render: (l: SmsLog) => l.template?.name || 'Manual' },
    { key: 'client', label: 'Client', render: (l: SmsLog) => l.client ? `${l.client.firstName} ${l.client.lastName}` : '—' },
    { key: 'recipientPhone', label: 'Phone' },
    { key: 'message', label: 'Message', render: (l: SmsLog) => <span className="truncate max-w-xs block">{l.message}</span> },
    { key: 'status', label: 'Status', render: (l: SmsLog) => <span className={`badge ${l.status === 'SENT' ? 'bg-green-100 text-green-700' : l.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{l.status}</span> },
    { key: 'sentAt', label: 'Sent At', render: (l: SmsLog) => formatDateTime(l.sentAt) },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="SMS" subtitle="Messaging and templates" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex border-b border-gray-200 mb-5 gap-1">
          {[
            { id: 'logs' as Tab, label: 'SMS Logs', icon: List },
            { id: 'send' as Tab, label: 'Send SMS', icon: Send },
            { id: 'templates' as Tab, label: 'Templates', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === 'logs' && (
          <DataTable columns={logCols as never[]} data={logs as never[]} loading={loading} meta={logMeta} onPageChange={setPage} />
        )}

        {tab === 'send' && (
          <div className="max-w-lg">
            <div className="form-section space-y-4">
              <h3 className="section-title">Send Message</h3>
              <div>
                <label className="label">Load from Template</label>
                <select value={sendForm.templateId} onChange={e => handleTemplateSelect(e.target.value)} className="input">
                  <option value="">Custom message…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Client *</label>
                <select value={sendForm.clientId} onChange={e => setSendForm(f => ({...f, clientId: e.target.value}))} className="input">
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.phonePrimary}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea value={sendForm.message} onChange={e => setSendForm(f => ({...f, message: e.target.value}))} className="input" rows={4} maxLength={160} />
                <p className="text-xs text-gray-400 text-right mt-0.5">{sendForm.message.length}/160</p>
              </div>
              <button onClick={handleSend} disabled={sending} className="btn-primary">
                <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send SMS'}
              </button>
            </div>
          </div>
        )}

        {tab === 'templates' && (
          <div>
            <PermissionGuard roles={['CEO_ADMIN', 'OPERATIONS_MANAGER']}>
              <div className="mb-4 flex justify-end">
                <button onClick={() => toast('Use the API to create templates — /sms/templates POST')} className="btn-primary text-xs">+ New Template</button>
              </div>
            </PermissionGuard>
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-900">{t.name}</span>
                      <span className="font-mono text-xs text-gray-400 ml-2">{t.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{t.triggerEvent}</span>
                      <span className={`badge ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 font-mono">{t.messageTemplate}</p>
                </div>
              ))}
              {!templates.length && <p className="text-gray-400 text-sm">No templates configured.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
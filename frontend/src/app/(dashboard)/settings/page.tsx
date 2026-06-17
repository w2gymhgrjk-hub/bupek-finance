'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Shield, Info, Eye, EyeOff, Loader2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS } from '@/lib/permissions';
import toast from 'react-hot-toast';

type SettingsTab = 'profile' | 'password' | 'security';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<{
    currentPassword: string; newPassword: string; confirmPassword: string;
  }>();

  const onChangePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed successfully');
      reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    }
  };

  if (!user) return null;

  const tabs = [
    { id: 'profile'  as SettingsTab, label: 'My Profile',  icon: User   },
    { id: 'password' as SettingsTab, label: 'Password',     icon: Lock   },
    { id: 'security' as SettingsTab, label: 'System Info',  icon: Info   },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Settings" subtitle="Manage your account and preferences" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Tab nav */}
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="space-y-5">
              <div className="card p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
                    <p className="text-sm text-gray-500">{ROLE_LABELS[user.role] ?? user.role}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-4">
                  {([
                    ['User Number',  user.userNo],
                    ['Email',        user.email],
                    ['Role',         ROLE_LABELS[user.role] ?? user.role],
                    ['Branch',       (user as any).branch?.name ?? 'HQ / All Branches'],
                    ['Phone',        (user as any).phone ?? '—'],
                    ['Status',       user.status ?? 'ACTIVE'],
                  ] as [string,string][]).map(([k,v]) => (
                    <div key={k} className="border-b border-gray-50 pb-3">
                      <dt className="text-xs text-gray-400 mb-0.5">{k}</dt>
                      <dd className="text-sm font-medium text-gray-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="card p-4 bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  To update your name, email or phone number, contact your system administrator.
                </p>
              </div>
            </div>
          )}

          {/* Password tab */}
          {tab === 'password' && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" /> Change Password
              </h3>
              <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
                {/* Current password */}
                <div className="form-group">
                  <label className="form-label">Current Password *</label>
                  <div className="relative">
                    <input {...register('currentPassword', { required: 'Required' })}
                      type={showCurrent ? 'text' : 'password'} className="input pr-10"
                      placeholder="Your current password" />
                    <button type="button" onClick={() => setShowCurrent(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && <p className="text-xs text-red-600 mt-1">{errors.currentPassword.message}</p>}
                </div>

                {/* New password */}
                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <div className="relative">
                    <input {...register('newPassword', {
                      required: 'Required',
                      minLength: { value: 8, message: 'Minimum 8 characters' },
                      validate: {
                        upper: v => /[A-Z]/.test(v) || 'Must have uppercase letter',
                        digit: v => /[0-9]/.test(v) || 'Must have a number',
                        special: v => /[^A-Za-z0-9]/.test(v) || 'Must have a special character',
                      },
                    })}
                      type={showNew ? 'text' : 'password'} className="input pr-10"
                      placeholder="New password" />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>}
                  <p className="text-xs text-gray-400 mt-1">Min 8 chars · Uppercase · Number · Special character</p>
                </div>

                {/* Confirm password */}
                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <div className="relative">
                    <input {...register('confirmPassword', {
                      required: 'Required',
                      validate: v => v === watch('newPassword') || 'Passwords do not match',
                    })}
                      type={showConfirm ? 'text' : 'password'} className="input pr-10"
                      placeholder="Confirm new password" />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Changing…</> : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* System Info tab */}
          {tab === 'security' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" /> System Information
                </h3>
                <dl className="space-y-2.5">
                  {([
                    ['System Name',     'BUPEK Finance System'],
                    ['Version',         'v1.0.0'],
                    ['Environment',     'Production'],
                    ['Database',        'PostgreSQL'],
                    ['API Base URL',    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'],
                    ['Session User',    `${user.firstName} ${user.lastName} (${user.role})`],
                  ] as [string,string][]).map(([k,v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <dt className="text-gray-400">{k}</dt>
                      <dd className="font-medium text-gray-900 text-right font-mono text-xs">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" /> Your Permissions
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  As <strong>{ROLE_LABELS[user.role]}</strong>, you have access to:
                </p>
                <div className="space-y-1.5">
                  {([
                    ['View Clients & Loans',       true],
                    ['Create / Edit Clients',       !['ACCOUNTANT'].includes(user.role)],
                    ['Create Loan Applications',    ['CEO_ADMIN','OPERATIONS_MANAGER','BRANCH_MANAGER','LOAN_OFFICER'].includes(user.role)],
                    ['Recommend Loans',             ['CEO_ADMIN','OPERATIONS_MANAGER','BRANCH_MANAGER','LOAN_OFFICER'].includes(user.role)],
                    ['Approve Loans',               ['CEO_ADMIN','OPERATIONS_MANAGER','BRANCH_MANAGER'].includes(user.role)],
                    ['Disburse Loans',              ['CEO_ADMIN','OPERATIONS_MANAGER'].includes(user.role)],
                    ['Record Repayments',           !['ACCOUNTANT'].includes(user.role)],
                    ['Manage Users',                ['CEO_ADMIN','OPERATIONS_MANAGER','BRANCH_MANAGER'].includes(user.role)],
                    ['View Reports',                true],
                    ['System Settings',             user.role === 'CEO_ADMIN'],
                  ] as [string, boolean][]).map(([perm, allowed]) => (
                    <div key={perm} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600">{perm}</span>
                      <span className={`badge text-xs ${allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                        {allowed ? '✓ Allowed' : '✗ Restricted'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

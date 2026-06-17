'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import TopBar from '@/components/layout/TopBar';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS } from '@/lib/permissions';

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 chars').regex(/[A-Z]/, 'Needs uppercase').regex(/[0-9]/, 'Needs number'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type PwForm = z.infer<typeof pwSchema>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const onSubmit = async (data: PwForm) => {
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed successfully');
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to change password');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Profile Settings" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <div className="form-section mb-6">
          <h3 className="section-title">Account Details</h3>
          <dl className="grid grid-cols-2 gap-4">
            {[
              ['Name', `${user.firstName} ${user.lastName}`],
              ['Email', user.email],
              ['Role', ROLE_LABELS[user.role]],
              ['User No', user.userNo],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-gray-500 mb-0.5">{k}</dt>
                <dd className="text-sm font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="form-section">
          <h3 className="section-title">Change Password</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input {...register('currentPassword')} type="password" className="input" />
              {errors.currentPassword && <p className="text-xs text-red-600 mt-1">{errors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="label">New Password</label>
              <input {...register('newPassword')} type="password" className="input" />
              {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input {...register('confirmPassword')} type="password" className="input" />
              {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
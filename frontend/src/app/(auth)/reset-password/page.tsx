'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Building2, Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';

type FormData = {
  newPassword: string;
  confirmPassword: string;
};

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [done, setDone] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>();

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
          <p className="text-gray-500 text-sm mb-6">This password reset link is invalid or has expired. Please request a new one.</p>
          <a href="/forgot-password" className="btn-primary w-full justify-center">Request New Link</a>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await authApi.resetPassword(token, data.newPassword);
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Reset failed. Your link may have expired.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <Building2 className="w-8 h-8 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">BUPEK Finance</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Password Reset!</h2>
              <p className="text-gray-500 text-sm mb-6">Your password has been changed successfully. You can now log in with your new password.</p>
              <button onClick={() => router.push('/login')} className="btn-primary w-full justify-center">Go to Login</button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">Set new password</h2>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('newPassword', {
                        required: 'Required',
                        minLength: { value: 8, message: 'Minimum 8 characters' },
                        validate: {
                          upper: v => /[A-Z]/.test(v) || 'Must include an uppercase letter',
                          digit: v => /[0-9]/.test(v) || 'Must include a number',
                          special: v => /[^A-Za-z0-9]/.test(v) || 'Must include a special character',
                        },
                      })}
                      type={showPwd ? 'text' : 'password'}
                      className="input pl-10 pr-10"
                      placeholder="New password"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>}
                  <p className="text-xs text-gray-400 mt-1">Min 8 chars · Uppercase · Number · Special character</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('confirmPassword', {
                        required: 'Required',
                        validate: v => v === watch('newPassword') || 'Passwords do not match',
                      })}
                      type={showConfirm ? 'text' : 'password'}
                      className="input pl-10 pr-10"
                      placeholder="Confirm new password"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

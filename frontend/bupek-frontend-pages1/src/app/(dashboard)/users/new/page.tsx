'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { usersApi, branchesApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Branch } from '@/types';
import { ROLE_LABELS } from '@/lib/permissions';

const schema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Required'),
  role: z.string().min(1, 'Select a role'),
  branchId: z.string().optional(),
  password: z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Must include uppercase').regex(/[0-9]/, 'Must include number'),
});
type FormData = z.infer<typeof schema>;

export default function NewUserPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const role = watch('role');
  const needsBranch = !['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role);

  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const onSubmit = async (data: FormData) => {
    try {
      await usersApi.create(data);
      toast.success('User created successfully');
      router.push('/users');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Add New User" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <button onClick={() => router.back()} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input {...register('firstName')} className="input" />
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input {...register('lastName')} className="input" />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} type="email" className="input" />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('phone')} className="input" placeholder="+255…" />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Role &amp; Branch</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Role</label>
                <select {...register('role')} className="input">
                  <option value="">Select role…</option>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>}
              </div>
              {needsBranch && (
                <div>
                  <label className="label">Branch</label>
                  <select {...register('branchId')} className="input">
                    <option value="">Select branch…</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Password</h3>
            <div>
              <label className="label">Initial Password</label>
              <input {...register('password')} type="password" className="input" />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              <p className="text-xs text-gray-400 mt-1">Min 8 chars, uppercase, number required.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
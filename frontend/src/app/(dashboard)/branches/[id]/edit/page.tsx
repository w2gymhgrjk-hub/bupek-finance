'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { branchesApi } from '@/lib/api';

const schema = z.object({
  name:     z.string().min(2, 'Branch name required'),
  address:  z.string().optional(),
  phone:    z.string().optional(),
  email:    z.string().email('Invalid email').optional().or(z.literal('')),
  region:   z.string().optional(),
  district: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    branchesApi.getById(id)
      .then(r => {
        const b = r.data.data;
        reset({
          name:     b.name     ?? '',
          address:  b.address  ?? '',
          phone:    b.phone    ?? '',
          email:    b.email    ?? '',
          region:   b.region   ?? '',
          district: b.district ?? '',
        });
      })
      .catch(() => { toast.error('Failed to load branch'); router.back(); })
      .finally(() => setLoading(false));
  }, [id, reset, router]);

  const onSubmit = async (data: FormData) => {
    try {
      await branchesApi.update(id, data);
      toast.success('Branch updated successfully');
      router.push('/branches');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to update branch');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="Edit Branch" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Edit Branch" subtitle="Update branch information" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <button onClick={() => router.back()} className="btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back to Branches
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="card-title">Branch Details</h3>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="form-group sm:col-span-2">
                    <label className="form-label">Branch Name <span className="text-red-500">*</span></label>
                    <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="e.g. Kariakoo Branch" />
                    {errors.name && <p className="form-error">{errors.name.message}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <input {...register('region')} className="input" placeholder="e.g. Dar es Salaam" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">District</label>
                    <input {...register('district')} className="input" placeholder="e.g. Ilala" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input {...register('phone')} className="input" placeholder="+255222000001" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input {...register('email')} type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="branch@bupekfinance.co.tz" />
                    {errors.email && <p className="form-error">{errors.email.message}</p>}
                  </div>

                  <div className="form-group sm:col-span-2">
                    <label className="form-label">Address</label>
                    <textarea {...register('address')} className="input" rows={2} placeholder="Street address…" />
                  </div>

                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-8">
              <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
              </button>
              <button type="button" onClick={() => router.back()} className="btn-secondary btn-lg">
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

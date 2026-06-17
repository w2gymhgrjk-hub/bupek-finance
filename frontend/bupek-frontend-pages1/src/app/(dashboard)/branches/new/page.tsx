'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { branchesApi } from '@/lib/api';

const schema = z.object({
  name: z.string().min(3, 'Required'),
  address: z.string().min(5, 'Required'),
  phone: z.string().min(10, 'Required'),
  email: z.string().email('Valid email').optional().or(z.literal('')),
  region: z.string().min(2, 'Required'),
  district: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewBranchPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await branchesApi.create(data);
      toast.success('Branch created');
      router.push('/branches');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to create branch');
    }
  };

  const Field = ({ name, label, type = 'text', placeholder = '' }: { name: keyof FormData; label: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="label">{label}</label>
      <input {...register(name)} type={type} className="input" placeholder={placeholder} />
      {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Add New Branch" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <button onClick={() => router.back()} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="form-section">
            <h3 className="section-title">Branch Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field name="name" label="Branch Name" placeholder="Kariakoo Branch" />
              <Field name="region" label="Region" placeholder="Dar es Salaam" />
              <Field name="district" label="District" placeholder="Ilala" />
              <Field name="phone" label="Phone" placeholder="+255…" />
              <Field name="email" label="Email" type="email" placeholder="branch@bupekfinance.co.tz" />
              <div className="col-span-2">
                <label className="label">Address</label>
                <textarea {...register('address')} className="input" rows={2} placeholder="Street address…" />
                {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating…' : 'Create Branch'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
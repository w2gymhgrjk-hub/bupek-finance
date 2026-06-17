'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { clientsApi, branchesApi, usersApi } from '@/lib/api';
import { Branch, User } from '@/types';

const schema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  nationalId: z.string().min(5, 'Required'),
  phonePrimary: z.string().min(10, 'Required'),
  phoneSecondary: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  educationLevel: z.string().optional(),
  branchId: z.string().min(1, 'Branch required'),
  loanOfficerId: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewClientPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const selectedBranch = watch('branchId');

  useEffect(() => { branchesApi.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (!selectedBranch) return;
    usersApi.list({ branchId: selectedBranch, role: 'LOAN_OFFICER' }).then(r => setOfficers(r.data.data)).catch(() => {});
  }, [selectedBranch]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await clientsApi.create(data);
      toast.success('Client registered successfully');
      router.push(`/clients/${res.data.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      if (e.response?.status === 409) toast.error('National ID already registered');
      else toast.error(e.response?.data?.message || 'Failed to create client');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Register New Client" />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <button onClick={() => router.back()} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">First Name *</label>
                <input {...register('firstName')} className="input" />
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>
              <div><label className="label">Last Name *</label>
                <input {...register('lastName')} className="input" />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>
              <div><label className="label">National ID *</label>
                <input {...register('nationalId')} className="input" />
                {errors.nationalId && <p className="text-xs text-red-600 mt-1">{errors.nationalId.message}</p>}
              </div>
              <div><label className="label">Date of Birth</label>
                <input {...register('dateOfBirth')} type="date" className="input" />
              </div>
              <div><label className="label">Gender</label>
                <select {...register('gender')} className="input">
                  <option value="">Select…</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div><label className="label">Marital Status</label>
                <select {...register('maritalStatus')} className="input">
                  <option value="">Select…</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>
              <div><label className="label">Education Level</label>
                <select {...register('educationLevel')} className="input">
                  <option value="">Select…</option>
                  <option value="PRIMARY">Primary</option>
                  <option value="SECONDARY">Secondary</option>
                  <option value="DIPLOMA">Diploma</option>
                  <option value="DEGREE">Degree</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Primary Phone *</label>
                <input {...register('phonePrimary')} className="input" placeholder="+255…" />
                {errors.phonePrimary && <p className="text-xs text-red-600 mt-1">{errors.phonePrimary.message}</p>}
              </div>
              <div><label className="label">Secondary Phone</label>
                <input {...register('phoneSecondary')} className="input" placeholder="+255…" />
              </div>
              <div className="col-span-2"><label className="label">Email</label>
                <input {...register('email')} type="email" className="input" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Branch *</label>
                <select {...register('branchId')} className="input">
                  <option value="">Select branch…</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {errors.branchId && <p className="text-xs text-red-600 mt-1">{errors.branchId.message}</p>}
              </div>
              <div><label className="label">Loan Officer</label>
                <select {...register('loanOfficerId')} className="input">
                  <option value="">Select officer…</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Registering…' : 'Register Client'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
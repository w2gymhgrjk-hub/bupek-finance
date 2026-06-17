'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { clientsApi, branchesApi, usersApi } from '@/lib/api';
import { Branch, User } from '@/types';

const schema = z.object({
  firstName:      z.string().min(2, 'Required'),
  lastName:       z.string().min(2, 'Required'),
  phonePrimary:   z.string().min(10, 'Required'),
  phoneSecondary: z.string().optional(),
  email:          z.string().email().optional().or(z.literal('')),
  dateOfBirth:    z.string().optional(),
  gender:         z.string().optional(),
  maritalStatus:  z.string().optional(),
  educationLevel: z.string().optional(),
  branchId:       z.string().min(1, 'Branch required'),
  loanOfficerId:  z.string().optional(),
  notes:          z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [branches, setBranches]   = useState<Branch[]>([]);
  const [officers, setOfficers]   = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const selectedBranch = watch('branchId');

  useEffect(() => {
    Promise.all([
      clientsApi.getById(id),
      branchesApi.list({ limit: 100 }),
    ]).then(([clientRes, branchRes]) => {
      setBranches(branchRes.data.data);
      const c = clientRes.data.data;
      reset({
        firstName:      c.firstName,
        lastName:       c.lastName,
        phonePrimary:   c.phonePrimary,
        phoneSecondary: c.phoneSecondary ?? '',
        email:          c.email ?? '',
        dateOfBirth:    c.dateOfBirth ? c.dateOfBirth.slice(0,10) : '',
        gender:         c.gender ?? '',
        maritalStatus:  c.maritalStatus ?? '',
        educationLevel: c.educationLevel ?? '',
        branchId:       c.branchId,
        loanOfficerId:  c.loanOfficerId ?? '',
        notes:          c.notes ?? '',
      });
    }).catch(() => {
      toast.error('Failed to load client');
      router.push('/clients');
    }).finally(() => setLoadingData(false));
  }, [id]);

  useEffect(() => {
    if (!selectedBranch) return;
    usersApi.list({ branchId: selectedBranch, role: 'LOAN_OFFICER', limit: 100 })
      .then(r => setOfficers(r.data.data)).catch(() => {});
  }, [selectedBranch]);

  const onSubmit = async (data: FormData) => {
    try {
      await clientsApi.update(id, data);
      toast.success('Client updated successfully');
      router.push(`/clients/${id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to update client');
    }
  };

  if (loadingData) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Edit Client" subtitle="Update client information" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <button onClick={() => router.back()} className="btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input {...register('firstName')} className={`input ${errors.firstName ? 'input-error' : ''}`} />
                  {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input {...register('lastName')} className={`input ${errors.lastName ? 'input-error' : ''}`} />
                  {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Phone *</label>
                  <input {...register('phonePrimary')} className={`input ${errors.phonePrimary ? 'input-error' : ''}`} />
                  {errors.phonePrimary && <p className="form-error">{errors.phonePrimary.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Secondary Phone</label>
                  <input {...register('phoneSecondary')} className="input" />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Email Address</label>
                  <input {...register('email')} type="email" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input {...register('dateOfBirth')} type="date" className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select {...register('gender')} className="input">
                    <option value="">Select…</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Marital Status</label>
                  <select {...register('maritalStatus')} className="input">
                    <option value="">Select…</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Education Level</label>
                  <select {...register('educationLevel')} className="input">
                    <option value="">Select…</option>
                    <option value="PRIMARY">Primary</option>
                    <option value="SECONDARY">Secondary</option>
                    <option value="TERTIARY">Tertiary</option>
                    <option value="UNIVERSITY">University</option>
                    <option value="NONE">None</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Branch Assignment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Branch *</label>
                  <select {...register('branchId')} className={`input ${errors.branchId ? 'input-error' : ''}`}>
                    <option value="">Select branch…</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.branchId && <p className="form-error">{errors.branchId.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Loan Officer</label>
                  <select {...register('loanOfficerId')} className="input">
                    <option value="">None</option>
                    {officers.map(o => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea {...register('notes')} className="input" rows={3} placeholder="Any relevant notes…" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-6">
              <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
              </button>
              <button type="button" onClick={() => router.back()} className="btn-secondary btn-lg">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bupek-finance-production.up.railway.app/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor – attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
}

// Response interceptor – handle 401 and token refresh
api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry && original.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        const token = data.data.accessToken;
        useAuthStore.getState().setAccessToken(token);
        processQueue(null, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── Typed API helpers ─────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, newPassword: password }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/users/${id}/status`, { status }),
  getActivity: (id: string) => api.get(`/users/${id}/activity`),
  profile: () => api.get('/users/profile'),
};

export const branchesApi = {
  list: (params?: Record<string, unknown>) => api.get('/branches', { params }),
  getById: (id: string) => api.get(`/branches/${id}`),
  create: (data: Record<string, unknown>) => api.post('/branches', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/branches/${id}`, data),
  getStaff: (id: string) => api.get(`/branches/${id}/staff`),
  getPerformance: (id: string, params?: Record<string, unknown>) => api.get(`/branches/${id}/performance`, { params }),
  compare: (params?: Record<string, unknown>) => api.get('/branches/compare', { params }),
};

export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/clients', { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: Record<string, unknown>) => api.post('/clients', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/clients/${id}`, data),
  updateStatus: (id: string, status: string, reason?: string) => api.patch(`/clients/${id}/status`, { status, reason }),
  updatePhoto: (id: string, file: File) => {
    const form = new FormData(); form.append('photo', file);
    return api.post(`/clients/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  addDocument: (id: string, file: File, documentType: string) => {
    const form = new FormData(); form.append('document', file); form.append('documentType', documentType);
    return api.post(`/clients/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteDocument: (id: string, docId: string) => api.delete(`/clients/${id}/documents/${docId}`),
  addAddress: (id: string, data: Record<string, unknown>) => api.post(`/clients/${id}/addresses`, data),
  updateAddress: (id: string, addrId: string, data: Record<string, unknown>) => api.put(`/clients/${id}/addresses/${addrId}`, data),
  addGuarantor: (id: string, data: Record<string, unknown>) => api.post(`/clients/${id}/guarantors`, data),
  upsertBusiness: (id: string, data: Record<string, unknown>) => api.put(`/clients/${id}/business`, data),
  getLoanHistory: (id: string) => api.get(`/clients/${id}/loan-history`),
};

export const loanProductsApi = {
  list: (params?: Record<string, unknown>) => api.get('/loan-products', { params }),
  getById: (id: string) => api.get(`/loan-products/${id}`),
  create: (data: Record<string, unknown>) => api.post('/loan-products', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/loan-products/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/loan-products/${id}/status`, { status }),
};

export const loansApi = {
  list: (params?: Record<string, unknown>) => api.get('/loans', { params }),
  getById: (id: string) => api.get(`/loans/${id}`),
  create: (data: Record<string, unknown>) => api.post('/loans', data),
  recommend: (id: string, notes?: string) => api.post(`/loans/${id}/recommend`, { notes }),
  approve: (id: string, notes?: string) => api.post(`/loans/${id}/approve`, { notes }),
  reject: (id: string, rejectionReason: string) => api.post(`/loans/${id}/reject`, { rejectionReason }),
  disburse: (id: string, data: Record<string, unknown>) => api.post(`/loans/${id}/disburse`, data),
  writeOff: (id: string, writeOffReason: string) => api.post(`/loans/${id}/write-off`, { writeOffReason }),
  getSchedule: (id: string) => api.get(`/loans/${id}/schedule`),
  getOverdue: (params?: Record<string, unknown>) => api.get('/loans/overdue', { params }),
  previewSchedule: (data: Record<string, unknown>) => api.post('/loans/preview-schedule', data),
};

export const repaymentsApi = {
  list: (params?: Record<string, unknown>) => api.get('/repayments', { params }),
  getById: (id: string) => api.get(`/repayments/${id}`),
  record: (data: Record<string, unknown>) => api.post('/repayments', data),
  reverse: (id: string, reversalReason: string) => api.post(`/repayments/${id}/reverse`, { reversalReason }),
  dailySummary: (params?: Record<string, unknown>) => api.get('/repayments/daily-summary', { params }),
  getReceipt: (id: string) => api.get(`/repayments/${id}/receipt`),
};

export const collectionsApi = {
  getOverdue: (params?: Record<string, unknown>) => api.get('/collections/overdue', { params }),
  getActivities: (loanId: string, params?: Record<string, unknown>) => api.get(`/collections/${loanId}/activities`, { params }),
  logActivity: (loanId: string, data: Record<string, unknown>) => api.post(`/collections/${loanId}/activities`, data),
  getArrearsReport: (params?: Record<string, unknown>) => api.get('/collections/arrears-report', { params }),
};

export const reportsApi = {
  getDashboard: (params?: Record<string, unknown>) => api.get('/reports/dashboard', { params }),
  getPAR: (params?: Record<string, unknown>) => api.get('/reports/par', { params }),
  getDailyCollections: (params?: Record<string, unknown>) => api.get('/reports/daily-collections', { params }),
  getLoanOfficerPerformance: (params?: Record<string, unknown>) => api.get('/reports/loan-officer-performance', { params }),
  getBranchPerformance: (params?: Record<string, unknown>) => api.get('/reports/branch-performance', { params }),
  getProfitSummary: (params?: Record<string, unknown>) => api.get('/reports/profit-summary', { params }),
  getExpenseSummary: (params?: Record<string, unknown>) => api.get('/reports/expense-summary', { params }),
};

export const smsApi = {
  getTemplates: () => api.get('/sms/templates'),
  createTemplate: (data: Record<string, unknown>) => api.post('/sms/templates', data),
  updateTemplate: (id: string, data: Record<string, unknown>) => api.put(`/sms/templates/${id}`, data),
  send: (data: Record<string, unknown>) => api.post('/sms/send', data),
  bulk: (data: Record<string, unknown>) => api.post('/sms/bulk', data),
  getLogs: (params?: Record<string, unknown>) => api.get('/sms/logs', { params }),
};
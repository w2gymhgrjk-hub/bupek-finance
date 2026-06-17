'use client';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS } from '@/lib/permissions';

interface TopBarProps { title: string; subtitle?: string; }

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuthStore();
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{user ? ROLE_LABELS[user.role] : ''}</span>
          {user?.branchName && <span className="badge bg-blue-50 text-blue-700">{user.branchName}</span>}
        </div>
      </div>
    </header>
  );
}
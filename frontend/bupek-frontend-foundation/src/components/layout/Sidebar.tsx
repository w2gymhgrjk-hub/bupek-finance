'use client';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Users, UserCheck, CreditCard,
  RepeatIcon, AlertTriangle, BarChart3, MessageSquare,
  ChevronDown, LogOut, Settings, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/permissions';
import { UserRole } from '@/types';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { label: 'Branches', href: '/branches', icon: Building2, roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER'] as UserRole[] },
  { label: 'Users', href: '/users', icon: Users, roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'] as UserRole[] },
  { label: 'Clients', href: '/clients', icon: UserCheck, roles: null },
  { label: 'Loans', href: '/loans', icon: CreditCard, roles: null },
  { label: 'Repayments', href: '/repayments', icon: RepeatIcon, roles: null },
  { label: 'Collections', href: '/collections', icon: AlertTriangle, roles: null },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: null },
  { label: 'SMS', href: '/sms', icon: MessageSquare, roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER', 'COLLECTION_OFFICER'] as UserRole[] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  };

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <aside className="flex flex-col w-64 bg-white border-r border-gray-200 h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">BUPEK Finance</p>
          <p className="text-xs text-gray-500">Management System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <a key={item.href} href={item.href}
              className={cn('sidebar-link', isActive && 'active')}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-700">
              {user?.firstName[0]}{user?.lastName[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user ? ROLE_LABELS[user.role] : ''}</p>
          </div>
        </div>
        <a href="/settings/profile" className={cn('sidebar-link text-xs', pathname.startsWith('/settings') && 'active')}>
          <Settings className="w-4 h-4" /> Settings
        </a>
        <button onClick={handleLogout} className="sidebar-link w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
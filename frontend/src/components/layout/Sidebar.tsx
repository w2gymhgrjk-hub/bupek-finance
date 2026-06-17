'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard, Users, Building2, UserSquare2, BadgeDollarSign,
  CreditCard, AlertTriangle, BarChart3, MessageSquare, Settings,
  LogOut, ChevronRight, Wallet, ShieldCheck, ChevronLeft, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard',     href: '/dashboard',       icon: LayoutDashboard },
    ],
  },
  {
    group: 'Administration',
    items: [
      { label: 'Users',         href: '/users',           icon: Users,           roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER'] },
      { label: 'Branches',      href: '/branches',        icon: Building2,       roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER'] },
      { label: 'Loan Products', href: '/loans/products',  icon: Wallet,          roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER'] },
    ],
  },
  {
    group: 'Lending',
    items: [
      { label: 'Clients',       href: '/clients',         icon: UserSquare2 },
      { label: 'Loans',         href: '/loans',           icon: BadgeDollarSign },
      { label: 'Repayments',    href: '/repayments',      icon: CreditCard },
    ],
  },
  {
    group: 'Collections',
    items: [
      { label: 'Overdue',       href: '/collections',     icon: AlertTriangle,   roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'COLLECTION_OFFICER'] },
    ],
  },
  {
    group: 'Insights',
    items: [
      { label: 'Reports',       href: '/reports',         icon: BarChart3,       roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT'] },
      { label: 'SMS',           href: '/sms',             icon: MessageSquare,   roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'] },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Settings',      href: '/settings',        icon: Settings,        roles: ['CEO_ADMIN'] },
      { label: 'Audit Trail',   href: '/audit',           icon: ShieldCheck,     roles: ['CEO_ADMIN', 'OPERATIONS_MANAGER'] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  CEO_ADMIN:           'CEO / Admin',
  OPERATIONS_MANAGER:  'Operations Mgr',
  BRANCH_MANAGER:      'Branch Manager',
  LOAN_OFFICER:        'Loan Officer',
  COLLECTION_OFFICER:  'Collection Officer',
  ACCOUNTANT:          'Accountant',
};

const ROLE_COLORS: Record<string, string> = {
  CEO_ADMIN:           'bg-amber-400',
  OPERATIONS_MANAGER:  'bg-blue-400',
  BRANCH_MANAGER:      'bg-teal-400',
  LOAN_OFFICER:        'bg-green-400',
  COLLECTION_OFFICER:  'bg-red-400',
  ACCOUNTANT:          'bg-purple-400',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  // Persist sidebar state across navigation
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem('sidebar-collapsed', String(!c));
      return !c;
    });
  };

  const role = user?.role ?? '';

  function canSee(item: NavItem) {
    if (!item.roles) return true;
    return item.roles.includes(role);
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    // Prevent /loans matching /loans/products
    if (href === '/loans') return pathname === '/loans' || (pathname.startsWith('/loans/') && !pathname.startsWith('/loans/products'));
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <aside className={`flex flex-col min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[64px]' : 'w-64'}`}>

      {/* ── Logo + collapse button ── */}
      <div className={`flex items-center border-b border-white/10 ${collapsed ? 'px-3 py-5 justify-center' : 'px-5 py-5 gap-3'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-white font-bold text-sm">BF</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">BUPEK FINANCE</p>
            <p className="text-slate-400 text-[10px] font-medium tracking-wide">LIMITED</p>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex-shrink-0 w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-hide space-y-0.5">
        {NAV.map((group) => {
          const visible = group.items.filter(canSee);
          if (!visible.length) return null;
          return (
            <div key={group.group}>
              {!collapsed && <p className="nav-group-label">{group.group}</p>}
              {collapsed && <div className="my-1 h-px bg-white/10 mx-1" />}
              {visible.map((item) => {
                const Icon   = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      title={collapsed ? item.label : undefined}
                      className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                    >
                      <Icon size={17} className="flex-shrink-0" />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {!collapsed && active && <ChevronRight size={13} className="opacity-60" />}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-white/10 p-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className={`w-8 h-8 rounded-full ${ROLE_COLORS[role] ?? 'bg-slate-500'} flex items-center justify-center text-white font-bold text-xs shadow flex-shrink-0`}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-400 text-[11px] truncate">
                {ROLE_LABELS[role] ?? role}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className={`w-8 h-8 rounded-full ${ROLE_COLORS[role] ?? 'bg-slate-500'} flex items-center justify-center text-white font-bold text-xs shadow mx-auto mb-1`}
            title={`${user?.firstName} ${user?.lastName} — ${ROLE_LABELS[role] ?? role}`}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:bg-red-500/20 hover:text-red-300 text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}

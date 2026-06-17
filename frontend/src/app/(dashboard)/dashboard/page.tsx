'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, CreditCard, AlertTriangle, DollarSign,
  TrendingUp, Clock, CheckCircle, Plus, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/shared/StatCard';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DashboardStats } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [collections, setCollections] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, colRes] = await Promise.all([
        reportsApi.getDashboard(),
        reportsApi.getDailyCollections({ startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10) }),
      ]);
      setStats(statsRes.data.data);
      setCollections(colRes.data.data.collections || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = (collections as Array<{ paymentDate: string; _sum: { amountReceived: number } }>).map(c => ({
    date: formatDate(c.paymentDate, 'dd MMM'),
    amount: Number(c._sum.amountReceived || 0),
  }));

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Dashboard" subtitle="Overview of portfolio performance" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* KPI Cards — clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div onClick={() => router.push('/loans')} className="cursor-pointer">
            <StatCard title="Total Portfolio" value={formatCurrency(stats?.totalPortfolio || 0)}
              subtitle="Outstanding principal" icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" loading={loading} />
          </div>
          <div onClick={() => router.push('/clients')} className="cursor-pointer">
            <StatCard title="Active Clients" value={stats?.totalClients || 0}
              icon={Users} iconBg="bg-green-50" iconColor="text-green-600" />
          </div>
          <div onClick={() => router.push('/loans')} className="cursor-pointer">
            <StatCard title="Active Loans" value={stats?.activeLoans || 0}
              icon={CreditCard} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          </div>
          <div onClick={() => router.push('/collections')} className="cursor-pointer">
            <StatCard title="Overdue Loans" value={stats?.overdueLoans || 0}
              icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Arrears" value={formatCurrency(stats?.totalArrears || 0)}
            icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <StatCard title="Today's Collections"
            value={formatCurrency(stats?.todayCollections?.amount || 0)}
            subtitle={`${stats?.todayCollections?.count || 0} payments`}
            icon={CheckCircle} iconBg="bg-teal-50" iconColor="text-teal-600" />
          <div onClick={() => router.push('/loans')} className="cursor-pointer">
            <StatCard title="Pending Loans" value={stats?.pendingLoans || 0}
              icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
          </div>
          <StatCard title="PAR Ratio"
            value={stats ? `${(((stats.totalArrears || 0) / Math.max(stats.totalPortfolio || 1, 1)) * 100).toFixed(1)}%` : '—'}
            subtitle="Portfolio at risk" icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" />
        </div>

        {/* Collections Chart */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Daily Collections — Last 30 Days</h3>
            <button onClick={() => router.push('/repayments')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all repayments <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {chartData.length === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-center">
              <CheckCircle className="w-10 h-10 text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm font-medium">No repayments recorded yet</p>
              <p className="text-gray-300 text-xs mt-1">Once payments are recorded, your collection chart will appear here</p>
              <button onClick={() => router.push('/repayments/new')} className="btn-primary mt-3 text-sm">
                <Plus className="w-4 h-4" /> Record First Payment
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="col" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Collected']} />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="url(#col)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'New Client',       href: '/clients/new',       icon: Users,          color: 'bg-blue-500'    },
              { label: 'New Loan',         href: '/loans/new',         icon: Plus,           color: 'bg-emerald-500' },
              { label: 'All Loans',        href: '/loans',             icon: CreditCard,     color: 'bg-indigo-500'  },
              { label: 'All Clients',      href: '/clients',           icon: Users,          color: 'bg-teal-500'    },
              { label: 'Record Payment',   href: '/repayments/new',    icon: CheckCircle,    color: 'bg-purple-500'  },
              { label: 'Overdue',          href: '/collections',       icon: AlertTriangle,  color: 'bg-red-500'     },
            ].map(link => (
              <button key={link.href} onClick={() => router.push(link.href)}
                className={`${link.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}>
                <link.icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
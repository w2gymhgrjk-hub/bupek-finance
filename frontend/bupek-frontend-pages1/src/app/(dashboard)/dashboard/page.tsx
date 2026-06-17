'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, CreditCard, AlertTriangle, DollarSign,
  TrendingUp, Clock, CheckCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/shared/StatCard';
import { reportsApi, repaymentsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DashboardStats } from '@/types';

export default function DashboardPage() {
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Portfolio" value={formatCurrency(stats?.totalPortfolio || 0)}
            subtitle="Outstanding principal" icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600" loading={loading} />
          <StatCard title="Active Clients" value={stats?.totalClients || 0}
            icon={Users} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatCard title="Active Loans" value={stats?.activeLoans || 0}
            icon={CreditCard} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          <StatCard title="Overdue Loans" value={stats?.overdueLoans || 0}
            icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Arrears" value={formatCurrency(stats?.totalArrears || 0)}
            icon={TrendingUp} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <StatCard title="Today's Collections"
            value={formatCurrency(stats?.todayCollections?.amount || 0)}
            subtitle={`${stats?.todayCollections?.count || 0} payments`}
            icon={CheckCircle} iconBg="bg-teal-50" iconColor="text-teal-600" />
          <StatCard title="Pending Loans" value={stats?.pendingLoans || 0}
            icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
          <StatCard title="PAR Ratio"
            value={stats ? `${(((stats.totalArrears || 0) / Math.max(stats.totalPortfolio || 1, 1)) * 100).toFixed(1)}%` : '—'}
            subtitle="Portfolio at risk" icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" />
        </div>

        {/* Collections Chart */}
        <div className="card p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Daily Collections — Last 30 Days</h3>
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
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Record Repayment', href: '/repayments/new', color: 'bg-blue-600 hover:bg-blue-700' },
            { label: 'New Loan Application', href: '/loans/new', color: 'bg-green-600 hover:bg-green-700' },
            { label: 'View Overdue Loans', href: '/collections', color: 'bg-red-600 hover:bg-red-700' },
          ].map(link => (
            <a key={link.href} href={link.href}
              className={`${link.color} text-white rounded-xl p-4 text-sm font-medium text-center transition-colors`}>
              {link.label}
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
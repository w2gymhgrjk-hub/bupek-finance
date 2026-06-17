'use client';
import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PAR { days: number; loanCount: number; outstanding: number; parRatio: string }
interface LO { officer: { firstName: string; lastName: string; userNo: string; branch?: { name: string } }; submitted: number; approved: number; activeLoans: number; overdueLoans: number; totalCollected: number }
interface Branch { branch: { name: string; branchCode: string }; clients: number; activeLoans: number; overdueLoans: number; portfolio: number; disbursed: number; collected: number }
interface DailyCol { paymentDate: string; _sum: { amountReceived: number } }

type Tab = 'par' | 'daily' | 'lo-performance' | 'branch' | 'profit';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('par');
  const [par, setPar] = useState<{ totalPortfolio: number; parBuckets: PAR[] } | null>(null);
  const [daily, setDaily] = useState<{ collections: DailyCol[]; totalAmount: number } | null>(null);
  const [loPerf, setLoPerf] = useState<LO[]>([]);
  const [branchPerf, setBranchPerf] = useState<Branch[]>([]);
  const [profit, setProfit] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0,10));

  useEffect(() => {
    setLoading(true);
    const params = { startDate, endDate };
    Promise.all([
      reportsApi.getPAR().then(r => setPar(r.data.data)).catch(()=>{}),
      reportsApi.getDailyCollections(params).then(r => setDaily(r.data.data)).catch(()=>{}),
      reportsApi.getLoanOfficerPerformance(params).then(r => setLoPerf(r.data.data || [])).catch(()=>{}),
      reportsApi.getBranchPerformance(params).then(r => setBranchPerf(r.data.data || [])).catch(()=>{}),
      reportsApi.getProfitSummary(params).then(r => setProfit(r.data.data)).catch(()=>{}),
    ]).finally(() => setLoading(false));
  }, [startDate, endDate]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'par', label: 'PAR Report' },
    { id: 'daily', label: 'Daily Collections' },
    { id: 'lo-performance', label: 'Loan Officer Performance' },
    { id: 'branch', label: 'Branch Performance' },
    { id: 'profit', label: 'Profit Summary' },
  ];

  const parColors = ['#22c55e','#84cc16','#eab308','#f97316','#ef4444','#991b1b'];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Reports & Analytics" />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Date filter */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm text-gray-500">Period:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-36" />
          <span className="text-gray-400">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-36" />
        </div>

        <div className="flex border-b border-gray-200 mb-5 gap-1 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center text-gray-400 py-12">Loading report…</div>}

        {!loading && tab === 'par' && par && (
          <div className="space-y-6">
            <div className="card p-5">
              <p className="text-sm text-gray-500 mb-1">Total Portfolio</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(par.totalPortfolio)}</p>
            </div>
            <div className="card overflow-hidden">
              <table className="table">
                <thead><tr><th>PAR Bucket</th><th>No. of Loans</th><th>Outstanding</th><th>PAR Ratio</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {par.parBuckets.map((b, i) => (
                    <tr key={b.days}>
                      <td><span className="font-medium">PAR {b.days}+</span></td>
                      <td>{b.loanCount}</td>
                      <td>{formatCurrency(b.outstanding)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(parseFloat(b.parRatio),100)}%`, backgroundColor: parColors[i] || '#ef4444' }} />
                          </div>
                          <span className="font-medium" style={{ color: parColors[i] }}>{b.parRatio}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tab === 'daily' && daily && (
          <div className="space-y-5">
            <div className="card p-5 inline-block">
              <p className="text-xs text-gray-500">Total Collected</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(daily.totalAmount)}</p>
            </div>
            <div className="card p-5">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={daily.collections.map(c => ({ date: formatDate(c.paymentDate, 'dd MMM'), amount: Number(c._sum.amountReceived||0) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Collected']} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!loading && tab === 'lo-performance' && (
          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr><th>Officer</th><th>Branch</th><th>Submitted</th><th>Approved</th><th>Active</th><th>Overdue</th><th>Total Collected</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {loPerf.map((l, i) => (
                  <tr key={i}>
                    <td><p className="font-medium">{l.officer.firstName} {l.officer.lastName}</p><p className="text-xs text-gray-400 font-mono">{l.officer.userNo}</p></td>
                    <td>{l.officer.branch?.name || '—'}</td>
                    <td>{l.submitted}</td>
                    <td>{l.approved}</td>
                    <td>{l.activeLoans}</td>
                    <td className={l.overdueLoans > 0 ? 'text-red-600 font-medium' : ''}>{l.overdueLoans}</td>
                    <td className="text-green-700 font-medium">{formatCurrency(l.totalCollected)}</td>
                  </tr>
                ))}
                {!loPerf.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No data</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'branch' && (
          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr><th>Branch</th><th>Clients</th><th>Active Loans</th><th>Overdue</th><th>Portfolio</th><th>Disbursed</th><th>Collected</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {branchPerf.map((b, i) => (
                  <tr key={i}>
                    <td><p className="font-medium">{b.branch.name}</p><p className="text-xs text-gray-400 font-mono">{b.branch.branchCode}</p></td>
                    <td>{b.clients}</td>
                    <td>{b.activeLoans}</td>
                    <td className={b.overdueLoans > 0 ? 'text-red-600 font-medium' : ''}>{b.overdueLoans}</td>
                    <td>{formatCurrency(b.portfolio)}</td>
                    <td>{formatCurrency(b.disbursed)}</td>
                    <td className="text-green-700">{formatCurrency(b.collected)}</td>
                  </tr>
                ))}
                {!branchPerf.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No data</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'profit' && profit && (
          <div className="grid grid-cols-2 gap-5">
            {[
              ['Interest Income', profit.interestIncome, 'text-green-700'],
              ['Penalty Income', profit.penaltyIncome, 'text-orange-600'],
              ['Charges Income', profit.chargesIncome, 'text-blue-700'],
              ['Processing Fees', profit.processingFees, 'text-indigo-600'],
              ['Insurance Fees', profit.insuranceFees, 'text-purple-600'],
              ['Total Income', profit.totalIncome, 'text-green-800 font-bold'],
            ].map(([k, v, cls]) => (
              <div key={String(k)} className="card p-5">
                <p className="text-sm text-gray-500">{k}</p>
                <p className={`text-xl font-bold mt-1 ${cls}`}>{formatCurrency(Number(v))}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
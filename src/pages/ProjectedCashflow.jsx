import { useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleTransactions, sampleProperties, sampleTenants } from '../data/sampleData';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Bar({ income, expense, maxVal }) {
  const iH = maxVal > 0 ? (income / maxVal) * 100 : 0;
  const eH = maxVal > 0 ? (expense / maxVal) * 100 : 0;
  return (
    <div className="flex items-end gap-1 h-32">
      <div className="flex-1 flex flex-col justify-end"><div className="bg-emerald-500/70 rounded-t transition-all" style={{ height: `${iH}%` }} /></div>
      <div className="flex-1 flex flex-col justify-end"><div className="bg-red-500/70 rounded-t transition-all" style={{ height: `${eH}%` }} /></div>
    </div>
  );
}

export default function ProjectedCashflow() {
  const [transactions] = useLocalStorage('lfjh_transactions', sampleTransactions);
  const [properties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [tenants] = useLocalStorage('lfjh_tenants', sampleTenants);

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const fmt = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const monthlyActuals = useMemo(() => MONTHS.map((_, mi) => {
    const month = `${currentYear}-${String(mi + 1).padStart(2, '0')}`;
    const txs = transactions.filter(t => t.date.startsWith(month));
    const income = txs.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, net: income - expense };
  }), [transactions, currentYear]);

  const monthlyProjectedIncome = useMemo(() =>
    tenants.filter(t => t.status === 'Active').reduce((s, t) => s + Number(t.monthlyRent), 0), [tenants]);

  const avgMonthlyExpense = useMemo(() => {
    const withData = monthlyActuals.filter(m => m.expense > 0);
    if (!withData.length) return 0;
    return withData.slice(-3).reduce((s, m) => s + m.expense, 0) / Math.min(withData.length, 3);
  }, [monthlyActuals]);

  const monthData = MONTHS.map((label, i) => {
    const actual = monthlyActuals[i];
    const isPast = i < currentMonthIdx;
    const isCurrent = i === currentMonthIdx;
    return { label, income: isPast || isCurrent ? actual.income : monthlyProjectedIncome, expense: isPast || isCurrent ? actual.expense : avgMonthlyExpense, net: isPast || isCurrent ? actual.net : monthlyProjectedIncome - avgMonthlyExpense, projected: !isPast && !isCurrent, isCurrent };
  });

  const maxVal = Math.max(...monthData.map(m => Math.max(m.income, m.expense)), 1);
  const totalIncome = monthData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthData.reduce((s, m) => s + m.expense, 0);
  const totalNet = totalIncome - totalExpense;

  const propertyBreakdown = useMemo(() => properties.map(p => {
    const txs = transactions.filter(t => t.propertyId === p.id && t.date.startsWith(String(currentYear)));
    const income = txs.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);
    const tenant = tenants.find(t => t.propertyId === p.id && t.status === 'Active');
    return { ...p, income, expense, net: income - expense, annualRent: tenant ? Number(tenant.monthlyRent) * 12 : 0 };
  }), [properties, transactions, tenants, currentYear]);

  return (
    <div className="p-8">
      <div className="mb-8"><h1 className="text-2xl font-bold text-white">Projected Cashflow</h1><p className="text-slate-400 text-sm mt-1">{currentYear} — Actuals + forward projections</p></div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><div className="text-xs text-slate-400 mb-1">YTD Income</div><div className="text-2xl font-bold text-emerald-400">{fmt(monthlyActuals.reduce((s, m) => s + m.income, 0))}</div><div className="text-xs text-slate-500 mt-1">Full year projected: {fmt(totalIncome)}</div></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><div className="text-xs text-slate-400 mb-1">YTD Expenses</div><div className="text-2xl font-bold text-red-400">{fmt(monthlyActuals.reduce((s, m) => s + m.expense, 0))}</div><div className="text-xs text-slate-500 mt-1">Full year projected: {fmt(totalExpense)}</div></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><div className="text-xs text-slate-400 mb-1">Net Cashflow</div><div className={`text-2xl font-bold ${totalNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalNet >= 0 ? '+' : '-'}{fmt(totalNet)}</div><div className="text-xs text-slate-500 mt-1">Full year projected</div></div>
      </div>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6 mb-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/70 inline-block" /> Income</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/70 inline-block" /> Expenses</span>
          <span className="text-slate-600">Faded = projected</span>
        </div>
        <div className="grid grid-cols-12 gap-2">
          {monthData.map((m, i) => (
            <div key={i} className={`${m.projected ? 'opacity-50' : ''} ${m.isCurrent ? 'ring-1 ring-emerald-500/40 rounded-lg' : ''}`}>
              <Bar income={m.income} expense={m.expense} maxVal={maxVal} />
              <div className="text-xs text-center text-slate-500 mt-1">{m.label}</div>
              <div className={`text-xs text-center font-medium mt-0.5 ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{m.net >= 0 ? '+' : ''}{fmt(m.net)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700"><h2 className="font-semibold text-white">Per-Property Breakdown ({currentYear})</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-navy-700 text-slate-400 text-xs uppercase"><th className="text-left px-5 py-3">Property</th><th className="text-right px-5 py-3">Income</th><th className="text-right px-5 py-3">Expenses</th><th className="text-right px-5 py-3">Net</th><th className="text-right px-5 py-3">Annual Rent</th></tr></thead>
          <tbody className="divide-y divide-navy-700">
            {propertyBreakdown.map(p => (
              <tr key={p.id} className="hover:bg-navy-700/40">
                <td className="px-5 py-3 text-white">{p.name}</td>
                <td className="px-5 py-3 text-right text-emerald-400">{fmt(p.income)}</td>
                <td className="px-5 py-3 text-right text-red-400">{fmt(p.expense)}</td>
                <td className={`px-5 py-3 text-right font-semibold ${p.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.net >= 0 ? '+' : '-'}{fmt(p.net)}</td>
                <td className="px-5 py-3 text-right text-slate-400">{fmt(p.annualRent)}</td>
              </tr>
            ))}
            {propertyBreakdown.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No properties</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

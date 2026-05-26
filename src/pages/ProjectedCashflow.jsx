import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleTransactions, sampleProperties, sampleTenants, samplePropertyTaxes, sampleHOADues } from '../data/sampleData';
import { txInMonth, txInYear, amountForMonth, amountForPropertyMonth, amountForPropertyYear } from '../utils/transactions';
import { sortByStreetName } from '../utils/sort';
import { usePropertyFilter } from '../context/PropertyFilter';

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    red:     'text-red-400 bg-red-400/10',
    yellow:  'text-yellow-400 bg-yellow-400/10',
    purple:  'text-purple-400 bg-purple-400/10',
  };
  return (
    <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
    </div>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Bar({ income, expense, ownerDraw, taxDue, maxVal, height }) {
  const h = (v) => maxVal > 0 ? `${(v / maxVal) * 100}%` : '0%';
  const taxFrac = taxDue > 0 && expense > 0 ? (taxDue / expense) * 100 : 0;
  return (
    <div className="flex gap-px" style={{ height }}>
      {/* Income */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="bg-emerald-500/80 rounded-t transition-all" style={{ height: h(income) }} />
      </div>
      {/* Expenses — stacked: red base at bottom, yellow tax/HOA on top */}
      <div className="flex-1 flex flex-col justify-end">
        <div style={{ height: h(expense) }} className="flex flex-col-reverse overflow-hidden rounded-t w-full">
          <div className="bg-red-500/80 flex-1" />
          {taxFrac > 0 && (
            <div className="bg-yellow-400/90 flex-shrink-0" style={{ height: `${taxFrac}%` }} />
          )}
        </div>
      </div>
      {/* Owner Draw */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="bg-purple-500/80 rounded-t transition-all" style={{ height: h(ownerDraw) }} />
      </div>
    </div>
  );
}

export default function ProjectedCashflow() {
  const [transactions]  = useLocalStorage('lfjh_transactions', sampleTransactions);
  const [properties]   = useLocalStorage('lfjh_properties', sampleProperties);
  const [tenants]      = useLocalStorage('lfjh_tenants', sampleTenants);
  const [taxRecords]   = useLocalStorage('lfjh_property_taxes', samplePropertyTaxes);
  const [hoaRecords]   = useLocalStorage('lfjh_hoa_dues', sampleHOADues);
  const [sfAccounts]   = useLocalStorage('lfjh_simplefin_accounts', {});

  const { filterProperty } = usePropertyFilter();
  const [viewMode, setViewMode] = useState('year');
  const [projectedOwnerDraw, setProjectedOwnerDraw] = useLocalStorage('lfjh_projected_owner_draw', 0); // 'year' | 'forward'
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const fmt = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtAxis = (n) => {
    if (n === 0) return '$0';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n)}`;
  };

  const getAmt = (tx, month) =>
    filterProperty ? amountForPropertyMonth(tx, filterProperty, month) : amountForMonth(tx, month);
  const inProp = (tx) =>
    !filterProperty || tx.propertyId === filterProperty || tx.splits?.some(sp => sp.propertyId === filterProperty);

  const monthlyActuals = useMemo(() => MONTHS.map((_, mi) => {
    const month = `${currentYear}-${String(mi + 1).padStart(2, '0')}`;
    const txs = transactions.filter(t => !t.excluded && txInMonth(t, month) && inProp(t));
    const income = txs.filter(t => t.type === 'Income').reduce((s, t) => s + getAmt(t, month), 0);
    const expense = txs.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw').reduce((s, t) => s + getAmt(t, month), 0);
    const expenseNoTax = txs.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw' && t.category !== 'Property Tax').reduce((s, t) => s + getAmt(t, month), 0);
    const ownerDraw = txs.filter(t => t.type === 'Expense' && t.category === 'Owner Draw').reduce((s, t) => s + getAmt(t, month), 0);
    return { income, expense, expenseNoTax, ownerDraw, net: income - expense };
  }), [transactions, currentYear, filterProperty]);

  const monthlyProjectedIncome = useMemo(() =>
    tenants
      .filter(t => t.status === 'Active')
      .filter(t => !filterProperty || t.propertyId === filterProperty)
      .reduce((s, t) => s + Number(t.monthlyRent), 0),
  [tenants, filterProperty]);

  // Average excludes property tax so it doesn't inflate projected months —
  // tax obligations are added separately via taxByMonth for their due month only
  const avgMonthlyExpense = useMemo(() => {
    const withData = monthlyActuals.filter(m => m.expenseNoTax > 0);
    if (!withData.length) return 0;
    return withData.slice(-3).reduce((s, m) => s + m.expenseNoTax, 0) / Math.min(withData.length, 3);
  }, [monthlyActuals]);

  // Unpaid property tax obligation balance keyed by due month (YYYY-MM)
  // Only includes obligations whose due date is in the current month or future
  const taxByMonth = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const paid = new Map();
    transactions
      .filter(tx => tx.category === 'Property Tax' && tx.taxYear && !tx.excluded)
      .forEach(tx => {
        const key = `${tx.propertyId || ''}|${tx.taxYear}|${tx.taxType || ''}`;
        paid.set(key, (paid.get(key) || 0) + Number(tx.amount));
      });

    const map = new Map();
    for (const r of taxRecords) {
      if (!r.dueDate || !r.annualAmount) continue;
      if (r.dueDate.slice(0, 7) < currentMonth) continue; // skip past-due
      if (filterProperty && r.propertyId !== filterProperty) continue;
      const key = `${r.propertyId}|${r.taxYear}|${r.taxType || ''}`;
      const balance = Math.max(Number(r.annualAmount) - (paid.get(key) || 0), 0);
      if (balance <= 0) continue;
      const month = r.dueDate.slice(0, 7);
      map.set(month, (map.get(month) || 0) + balance);
    }
    return map;
  }, [taxRecords, transactions, filterProperty]);

  // Unpaid HOA dues balance keyed by due month — same logic as taxByMonth
  const hoaByMonth = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const paid = new Map();
    transactions
      .filter(tx => tx.category === 'HOA Fees' && !tx.excluded)
      .forEach(tx => {
        const year = tx.taxYear || new Date(tx.date).getFullYear();
        const key  = `${tx.propertyId || ''}|${year}`;
        paid.set(key, (paid.get(key) || 0) + Number(tx.amount));
      });

    const map = new Map();
    for (const r of hoaRecords) {
      if (!r.dueDate || !r.annualAmount) continue;
      if (r.dueDate.slice(0, 7) < currentMonth) continue;
      if (filterProperty && r.propertyId !== filterProperty) continue;
      const key     = `${r.propertyId}|${r.year}`;
      const balance = Math.max(Number(r.annualAmount) - (paid.get(key) || 0), 0);
      if (balance <= 0) continue;
      const month = r.dueDate.slice(0, 7);
      map.set(month, (map.get(month) || 0) + balance);
    }
    return map;
  }, [hoaRecords, transactions, filterProperty]);

  // Build the 12 chart slots depending on view mode
  const chartSlots = useMemo(() => {
    if (viewMode === 'year') {
      return Array.from({ length: 12 }, (_, i) => ({
        label: MONTHS[i],
        month: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
        isPast: i < currentMonthIdx,
        isCurrent: i === currentMonthIdx,
      }));
    }
    // Rolling 12 months starting from the current month
    return Array.from({ length: 12 }, (_, i) => {
      const d   = new Date(currentYear, currentMonthIdx + i, 1);
      const yr  = d.getFullYear();
      const mi  = d.getMonth();
      const month = `${yr}-${String(mi + 1).padStart(2, '0')}`;
      const label = MONTHS[mi] + (yr !== currentYear ? ` '${String(yr).slice(2)}` : '');
      return { label, month, isPast: false, isCurrent: i === 0 };
    });
  }, [viewMode, currentYear, currentMonthIdx]);

  const monthData = useMemo(() => chartSlots.map(({ label, month, isPast, isCurrent }) => {
    // Compute actuals for this month from transactions
    const txs = transactions.filter(t => !t.excluded && txInMonth(t, month) && inProp(t));
    const actualIncome    = txs.filter(t => t.type === 'Income').reduce((s, t) => s + getAmt(t, month), 0);
    const actualExpense   = txs.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw').reduce((s, t) => s + getAmt(t, month), 0);
    const actualOwnerDraw = txs.filter(t => t.type === 'Expense' && t.category === 'Owner Draw').reduce((s, t) => s + getAmt(t, month), 0);

    const taxDue    = (taxByMonth.get(month) || 0) + (hoaByMonth.get(month) || 0);
    const income    = isPast || isCurrent ? actualIncome    : monthlyProjectedIncome;
    const expense   = (isPast || isCurrent ? actualExpense  : avgMonthlyExpense) + (isPast ? 0 : taxDue);
    const ownerDraw = isPast ? actualOwnerDraw
      : isCurrent ? (actualOwnerDraw || Number(projectedOwnerDraw) || 0)
      : Number(projectedOwnerDraw) || 0;
    return { label, month, income, expense, ownerDraw, taxDue: isPast ? 0 : taxDue, net: income - expense, projected: !isPast && !isCurrent, isCurrent };
  }), [chartSlots, transactions, monthlyProjectedIncome, avgMonthlyExpense, taxByMonth, hoaByMonth, filterProperty, projectedOwnerDraw]);

  const maxVal = Math.max(...monthData.map(m => Math.max(m.income, m.expense, m.ownerDraw)), 1);

  // Running account balance projection — always use Chase account ending in 3667
  const acct3667 = useMemo(() =>
    Object.values(sfAccounts).find(a => a.accountName?.includes('3667') || a.id?.includes('3667')),
  [sfAccounts]);
  const startBalance = acct3667 ? acct3667.balance : null;

  const runningBalance = useMemo(() => {
    if (startBalance === null) return null;
    const result = [];
    let balance = null;
    for (let i = 0; i < monthData.length; i++) {
      const m = monthData[i];
      if (balance === null) {
        if (m.isCurrent || viewMode === 'forward') {
          balance = startBalance;  // anchor at current balance on current month
          result.push(balance);
        } else {
          result.push(null);  // past months: no data
        }
      } else {
        balance += m.net - m.ownerDraw; // owner draw is a real cash outflow
        result.push(balance);
      }
    }
    return result;
  }, [startBalance, monthData, viewMode]);

  const balanceVals = runningBalance ? runningBalance.filter(v => v !== null) : [];
  const minBal = 0;
  const maxBal = balanceVals.length ? Math.max(...balanceVals) * 1.05 : 1;
  const CHART_H = 320;
  const balY = (v) => v === null ? null : CHART_H - (v / maxBal) * CHART_H;
  const totalIncome = monthData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthData.reduce((s, m) => s + m.expense, 0);
  const totalNet = monthData.reduce((s, m) => s + m.net, 0);

  const propertyBreakdown = useMemo(() => {
    const yearTx = transactions.filter(t => !t.excluded && txInYear(t, currentYear));
    const visibleProps = sortByStreetName(filterProperty ? properties.filter(p => p.id === filterProperty) : properties);
    return visibleProps.map(p => {
      const relevant = yearTx.filter(t =>
        t.propertyId === p.id || t.splits?.some(s => s.propertyId === p.id));
      const income = relevant.filter(t => t.type === 'Income')
        .reduce((s, t) => s + amountForPropertyYear(t, p.id, currentYear), 0);
      const expense = relevant.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw')
        .reduce((s, t) => s + amountForPropertyYear(t, p.id, currentYear), 0);
      const ownerDraw = relevant.filter(t => t.type === 'Expense' && t.category === 'Owner Draw')
        .reduce((s, t) => s + amountForPropertyYear(t, p.id, currentYear), 0);
      const tenant = tenants.find(t => t.propertyId === p.id && t.status === 'Active');
      return { ...p, income, expense, ownerDraw, net: income - expense, annualRent: tenant ? Number(tenant.monthlyRent) * 12 : 0 };
    });
  }, [properties, transactions, tenants, currentYear, filterProperty]);

  return (
    <div className="p-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projected Cashflow</h1>
          <p className="text-slate-400 text-sm mt-1">{viewMode === 'year' ? `${currentYear} — Actuals + forward projections` : '12 months forward from today'}</p>
        </div>
        <div className="flex gap-1 p-1 bg-navy-800 border border-navy-700 rounded-lg">
          <button onClick={() => setViewMode('year')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'year' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>Current Year</button>
          <button onClick={() => setViewMode('forward')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'forward' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>12 Months Forward</button>
        </div>
      </div>

      {/* Row 1 — 4 summary stat cards (totals reflect the active view mode) */}
      {(() => {
        const isYear   = viewMode === 'year';
        const period   = isYear ? `${currentYear}` : 'Next 12 months';
        const ytdInc   = monthlyActuals.reduce((s, m) => s + m.income, 0);
        const ytdExp   = monthlyActuals.reduce((s, m) => s + m.expense, 0);
        const ytdDraw  = monthlyActuals.reduce((s, m) => s + m.ownerDraw, 0);
        const totalDraw = monthData.reduce((s, m) => s + (m.ownerDraw ?? 0), 0);
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp}   label={`${period} Income`}    value={fmt(totalIncome)}  sub={isYear ? `YTD: ${fmt(ytdInc)}`  : 'Actuals + projected'} color="emerald" />
            <StatCard icon={TrendingDown} label={`${period} Expenses`}  value={fmt(totalExpense)} sub={isYear ? `YTD: ${fmt(ytdExp)}`  : 'Actuals + projected'} color="red" />
            <StatCard icon={DollarSign}   label={`${period} Owner Draw`} value={fmt(totalDraw)}   sub={isYear ? `YTD: ${fmt(ytdDraw)}` : 'Actuals + projected'} color="purple" />
            <StatCard icon={DollarSign}   label="Net Cashflow"           value={(totalNet >= 0 ? '+' : '-') + fmt(totalNet)} sub={period} color={totalNet >= 0 ? 'emerald' : 'red'} />
          </div>
        );
      })()}

      {/* Row 2 — Full-width bar chart */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        {/* Legend + account selector */}
        <div className="flex items-center flex-wrap gap-4 mb-5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/80 inline-block" /> Income</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/80 inline-block" /> Expenses</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500/80 inline-block" /> Owner Draw</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400/90 inline-block" /> Taxes/HOA Dues</span>
          {runningBalance && <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-blue-400 inline-block rounded" /><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Chase ···3667 Balance</span>}
          <span className="text-slate-600">Faded = projected</span>
          <label className="flex items-center gap-2 ml-auto text-slate-400">
            <span className="whitespace-nowrap">Projected Owner Draw</span>
            <div className="flex items-center bg-navy-900 border border-navy-700 rounded-lg overflow-hidden">
              <span className="px-2 text-slate-500 text-xs">$</span>
              <input
                type="number"
                min="0"
                step="100"
                value={projectedOwnerDraw || ''}
                onChange={e => setProjectedOwnerDraw(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-20 bg-transparent py-1 pr-2 text-xs text-white focus:outline-none"
              />
              <span className="pr-2 text-slate-500 text-xs">/mo</span>
            </div>
          </label>
        </div>

        {/* Chart */}
        <div className="flex gap-3">
          {/* Left Y-axis — bars scale */}
          <div className="flex flex-col justify-between text-right text-xs text-slate-500 w-10 flex-shrink-0"
               style={{ height: 358, paddingBottom: 38 }}>
            {[1, 0.75, 0.5, 0.25, 0].map(pct => (
              <span key={pct}>{fmtAxis(maxVal * pct)}</span>
            ))}
          </div>

          {/* Bars + SVG balance line overlay */}
          <div className="flex-1 relative">
            <div className="grid grid-cols-12 gap-3">
              {monthData.map((m, i) => (
                <div key={i} className={`relative group ${m.projected ? 'opacity-40' : ''} ${m.isCurrent ? 'ring-1 ring-slate-500/40 rounded-lg' : ''}`}>
                  <Bar income={m.income} expense={m.expense} ownerDraw={m.ownerDraw ?? 0} taxDue={m.taxDue ?? 0} maxVal={maxVal} height={CHART_H} />
                  <div className="text-xs text-center text-slate-500 mt-2">
                    {m.label}
                  </div>
                  <div className={`text-xs text-center font-semibold mt-0.5 ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{m.net >= 0 ? '+' : ''}{fmt(m.net)}</div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-44 bg-navy-900 border border-navy-600 rounded-lg p-2.5 text-xs shadow-lg pointer-events-none">
                    <div className="text-slate-300 font-medium mb-1.5">{m.label}{m.projected ? ' (proj.)' : ''}</div>
                    <div className="flex justify-between text-emerald-400 mb-0.5"><span>Income</span><span>{fmt(m.income)}</span></div>
                    <div className="flex justify-between text-red-400 mb-0.5"><span>Expenses</span><span>{fmt(m.expense)}</span></div>
                    {(m.ownerDraw ?? 0) > 0 && <div className="flex justify-between text-purple-400 mb-0.5"><span>Owner Draw</span><span>{fmt(m.ownerDraw)}</span></div>}
                    {m.taxDue > 0 && <div className="flex justify-between text-yellow-400 mb-0.5"><span>Taxes/HOA Dues</span><span>{fmt(m.taxDue)}</span></div>}
                    {runningBalance?.[i] !== null && runningBalance?.[i] !== undefined && (
                      <div className="flex justify-between text-blue-400 mb-0.5"><span>Balance</span><span>{fmtAxis(runningBalance[i])}</span></div>
                    )}
                    <div className={`flex justify-between font-semibold border-t border-navy-700 mt-1 pt-1 ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}><span>Net</span><span>{m.net >= 0 ? '+' : ''}{fmt(m.net)}</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* SVG balance line overlay */}
            {runningBalance && balanceVals.length > 1 && (
              <svg
                viewBox="0 0 1200 320"
                preserveAspectRatio="none"
                className="absolute top-0 left-0 w-full pointer-events-none"
                style={{ height: CHART_H }}
              >
                {/* Line segments between consecutive non-null points */}
                {runningBalance.map((v, i) => {
                  if (v === null || runningBalance[i + 1] === null || runningBalance[i + 1] === undefined) return null;
                  const x1 = (i + 0.5) * 100;
                  const x2 = (i + 1.5) * 100;
                  const y1 = balY(v);
                  const y2 = balY(runningBalance[i + 1]);
                  const isProjected = monthData[i + 1]?.projected;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={isProjected ? '6 4' : undefined} />;
                })}
                {/* Dots at each data point */}
                {runningBalance.map((v, i) => {
                  if (v === null) return null;
                  return <circle key={i} cx={(i + 0.5) * 100} cy={balY(v)} r="4" fill="#60a5fa" stroke="#1e3a5f" strokeWidth="2" />;
                })}
              </svg>
            )}
          </div>

          {/* Right Y-axis — balance scale */}
          {runningBalance && balanceVals.length > 0 && (
            <div className="flex flex-col justify-between text-left text-xs text-blue-400/70 w-12 flex-shrink-0"
                 style={{ height: 358, paddingBottom: 38 }}>
              {[1, 0.75, 0.5, 0.25, 0].map(pct => (
                <span key={pct}>{fmtAxis(maxBal * pct)}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — Per-property detail cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {propertyBreakdown.map(p => (
          <div key={p.id} className="bg-navy-800 rounded-xl p-5 border border-navy-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm truncate">{p.name}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${p.net >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                <DollarSign size={18} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${p.net >= 0 ? 'text-white' : 'text-red-400'}`}>{p.net >= 0 ? '+' : '-'}{fmt(p.net)}</div>
            <div className="text-slate-400 text-xs mt-1">
              <span className="text-emerald-400">{fmt(p.income)}</span> in · <span className="text-red-400">{fmt(p.expense)}</span> out
              {p.ownerDraw > 0 && <span> · <span className="text-purple-400">{fmt(p.ownerDraw)}</span> draw</span>}
            </div>
          </div>
        ))}
        {propertyBreakdown.length === 0 && (
          <div className="col-span-4 bg-navy-800 border border-navy-700 rounded-xl p-8 text-center text-slate-500">No properties found</div>
        )}
      </div>

    </div>
  );
}

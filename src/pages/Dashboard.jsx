import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, TrendingUp, TrendingDown, DollarSign, ArrowUpRight } from 'lucide-react';
import { useAppData } from '../context/AppData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { txInMonth, amountForMonth, amountForPropertyMonth } from '../utils/transactions';
import { sortByStreetName } from '../utils/sort';
import { usePropertyFilter } from '../context/PropertyFilter';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    blue:    'text-blue-400 bg-blue-400/10',
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

export default function Dashboard() {
  const { properties, tenants, transactions, propertyTaxes } = useAppData();
  const [rentcastData]  = useLocalStorage('lfjh_rentcast', {});
  const [sfAccounts]    = useLocalStorage('lfjh_simplefin_accounts', {});

  const { filterProperty } = usePropertyFilter();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthIdx = new Date().getMonth();

  const propAmt = (tx, month) =>
    filterProperty ? amountForPropertyMonth(tx, filterProperty, month) : amountForMonth(tx, month);

  const inProp = (tx) =>
    !filterProperty ||
    tx.propertyId === filterProperty ||
    tx.splits?.some(sp => sp.propertyId === filterProperty);

  const fmt = (n) => '$' + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtFull = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtAxis = (n) => {
    if (n === 0) return '$0';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n)}`;
  };

  const stats = useMemo(() => {
    const thisMonthTx = transactions.filter(tx => !tx.excluded && txInMonth(tx, currentMonth) && inProp(tx));
    const income = thisMonthTx.filter(t => t.type === 'Income').reduce((s, t) => s + propAmt(t, currentMonth), 0);
    const expenses = thisMonthTx.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw').reduce((s, t) => s + propAmt(t, currentMonth), 0);
    const ownerDraw = thisMonthTx.filter(t => t.type === 'Expense' && t.category === 'Owner Draw').reduce((s, t) => s + propAmt(t, currentMonth), 0);
    const visibleProps = filterProperty ? properties.filter(p => p.id === filterProperty) : properties;
    const visibleTenants = filterProperty ? tenants.filter(t => t.propertyId === filterProperty) : tenants;
    const occupied = visibleProps.filter(p => p.status === 'Occupied').length;
    const activeTenants = visibleTenants.filter(t => t.status === 'Active').length;
    // Build paid-amount map from Property Tax transactions
    const taxPaid = new Map();
    transactions
      .filter(tx => tx.category === 'Property Tax' && tx.taxYear && !tx.excluded)
      .forEach(tx => {
        const key = `${tx.propertyId || ''}|${tx.taxYear}|${tx.taxType || ''}`;
        taxPaid.set(key, (taxPaid.get(key) || 0) + Number(tx.amount));
      });
    const todayStr = new Date().toISOString().slice(0, 10);
    const unpaidTaxes = propertyTaxes
      .filter(t => !filterProperty || t.propertyId === filterProperty)
      .filter(t => t.dueDate && t.dueDate < todayStr && t.annualAmount > 0)
      .reduce((s, t) => {
        const key = `${t.propertyId}|${t.taxYear}|${t.taxType || ''}`;
        const balance = Math.max(Number(t.annualAmount) - (taxPaid.get(key) || 0), 0);
        return s + balance;
      }, 0);
    return { income, expenses, ownerDraw, netCashflow: income - expenses, occupied, activeTenants, unpaidTaxes, totalProps: visibleProps.length };
  }, [transactions, properties, tenants, propertyTaxes, currentMonth, filterProperty]);

  const monthlyData = useMemo(() => MONTHS.map((label, mi) => {
    const month = `${currentYear}-${String(mi + 1).padStart(2, '0')}`;
    const txs = transactions.filter(t => !t.excluded && txInMonth(t, month) && inProp(t));
    const income = txs.filter(t => t.type === 'Income').reduce((s, t) => s + propAmt(t, month), 0);
    const expenses = txs.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw').reduce((s, t) => s + propAmt(t, month), 0);
    const ownerDraw = txs.filter(t => t.type === 'Expense' && t.category === 'Owner Draw').reduce((s, t) => s + propAmt(t, month), 0);
    const net = income - expenses;
    const isFuture = mi > currentMonthIdx;
    return { label, income, expenses, ownerDraw, net, isFuture };
  }), [transactions, currentYear, currentMonthIdx, filterProperty]);

  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses + m.ownerDraw)), 1);

  const recentTransactions = useMemo(() =>
    [...transactions].filter(tx => !tx.excluded && inProp(tx)).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [transactions, filterProperty]
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Property Finance Overview — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={TrendingUp} label="Monthly Income" value={fmtFull(stats.income)} sub="This month" color="emerald" />
        <StatCard icon={TrendingDown} label="Monthly Expenses" value={fmtFull(stats.expenses)} sub="Excl. owner draw" color="red" />
        <StatCard icon={DollarSign} label="Owner Draw" value={fmtFull(stats.ownerDraw)} sub="This month" color="purple" />
        <StatCard icon={DollarSign} label="Net Cashflow" value={fmtFull(stats.netCashflow)} sub="This month" color={stats.netCashflow >= 0 ? 'emerald' : 'red'} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={Building2} label="Properties" value={stats.totalProps} sub={`${stats.occupied} occupied`} color="blue" />
        <StatCard icon={Users} label="Active Tenants" value={stats.activeTenants} sub={`of ${tenants.length} total`} color="blue" />
        <StatCard icon={DollarSign} label="Unpaid Taxes" value={fmtFull(stats.unpaidTaxes)} sub="Outstanding" color="yellow" />
      </div>

      {/* Income vs Expenses chart */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">{currentYear} Income vs Expenses</h2>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/80 inline-block" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/80 inline-block" /> Expenses</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500/80 inline-block" /> Owner Draw</span>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Y-axis — h-44 (176px) bars + ~34px text below */}
          <div className="flex flex-col justify-between text-right text-xs text-slate-500 w-10 flex-shrink-0"
               style={{ height: 210, paddingBottom: 34 }}>
            {[1, 0.75, 0.5, 0.25, 0].map(pct => (
              <span key={pct}>{fmtAxis(maxVal * pct)}</span>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-12 gap-1.5">
          {monthlyData.map((m, i) => {
            const iH = maxVal > 0 ? (m.income / maxVal) * 100 : 0;
            const eH = maxVal > 0 ? (m.expenses / maxVal) * 100 : 0;
            const oH = maxVal > 0 ? (m.ownerDraw / maxVal) * 100 : 0;
            const isCurrentMonth = i === currentMonthIdx;
            return (
              <div key={i} className={`${m.isFuture ? 'opacity-30' : ''} ${isCurrentMonth ? 'ring-1 ring-slate-500/40 rounded-lg' : ''} group relative`}>
                <div className="flex gap-0.5 h-44">
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-emerald-500/80 rounded-t transition-all" style={{ height: `${iH}%` }} />
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-red-500/80 rounded-t transition-all" style={{ height: `${eH}%` }} />
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-purple-500/80 rounded-t transition-all" style={{ height: `${oH}%` }} />
                  </div>
                </div>
                <div className="text-xs text-center text-slate-500 mt-1">{m.label}</div>
                {(m.income > 0 || m.expenses > 0) && (
                  <div className={`text-xs text-center font-medium mt-0.5 ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.net >= 0 ? '+' : '-'}{fmt(m.net)}
                  </div>
                )}
                {/* Hover tooltip */}
                {!m.isFuture && (m.income > 0 || m.expenses > 0) && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-36 bg-navy-900 border border-navy-600 rounded-lg p-2 text-xs shadow-lg">
                    <div className="text-slate-300 font-medium mb-1">{m.label} {currentYear}</div>
                    <div className="flex justify-between text-emerald-400"><span>Income</span><span>{fmt(m.income)}</span></div>
                    <div className="flex justify-between text-red-400"><span>Expenses</span><span>{fmt(m.expenses)}</span></div>
                    {m.ownerDraw > 0 && <div className="flex justify-between text-purple-400"><span>Owner Draw</span><span>{fmt(m.ownerDraw)}</span></div>}
                    <div className={`flex justify-between font-semibold border-t border-navy-700 mt-1 pt-1 ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span>Net</span><span>{m.net >= 0 ? '+' : '-'}{fmt(m.net)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Equity over time chart */}
      {(() => {
        const [snapshots] = [JSON.parse(localStorage.getItem('lfjh_equity_snapshots') || '{}')];
        const visibleProps = sortByStreetName(
          filterProperty ? properties.filter(p => p.id === filterProperty) : properties
        );

        // Build current-month live data to fill in if no snapshot yet
        const currentMonth = new Date().toISOString().slice(0, 7);
        const liveFrame = {};
        for (const p of visibleProps) {
          const rc = rentcastData[p.id];
          if (!rc?.estimatedValue) continue;
          const mortgageAcct = p.mortgageAccountId ? sfAccounts[p.mortgageAccountId] : null;
          liveFrame[p.id] = {
            estimatedValue: rc.estimatedValue,
            mortgageBalance: mortgageAcct?.balance || 0,
            equity: Math.max(rc.estimatedValue - (mortgageAcct?.balance || 0), 0),
          };
        }
        if (Object.keys(liveFrame).length && !snapshots[currentMonth]) {
          snapshots[currentMonth] = liveFrame;
        }

        // Last 12 months that have data
        const monthKeys = Object.keys(snapshots).sort().slice(-12);
        if (!monthKeys.length || !visibleProps.length) return null;

        // Property colors (by sorted position)
        const COLORS = ['#10b981','#3b82f6','#a855f7','#f59e0b'];
        const fmtK = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : `$${Math.round(n/1_000)}k`;
        const EQUITY_H = 200;
        const monthLabel = (m) => {
          const [y, mo] = m.split('-');
          return MONTHS[parseInt(mo) - 1] + (y !== String(new Date().getFullYear()) ? ` '${y.slice(2)}` : '');
        };

        const maxEquity = Math.max(...monthKeys.map(m =>
          visibleProps.reduce((s, p) => s + (snapshots[m]?.[p.id]?.equity || 0), 0)
        ), 1);

        return (
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Property Equity Over Time</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {visibleProps.map((p, i) => (
                  <span key={p.id} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: COLORS[i % COLORS.length] + 'cc' }} />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              {/* Y-axis */}
              <div className="flex flex-col justify-between text-right text-xs text-slate-500 w-12 flex-shrink-0"
                   style={{ height: EQUITY_H + 40, paddingBottom: 40 }}>
                {[1, 0.75, 0.5, 0.25, 0].map(pct => (
                  <span key={pct}>{fmtK(maxEquity * pct)}</span>
                ))}
              </div>
              {/* Monthly bars */}
              <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${monthKeys.length}, 1fr)` }}>
                {monthKeys.map(m => {
                  const totalEquity = visibleProps.reduce((s, p) => s + (snapshots[m]?.[p.id]?.equity || 0), 0);
                  const barH = (totalEquity / maxEquity) * EQUITY_H;
                  let offset = 0;
                  return (
                    <div key={m} className="group relative flex flex-col items-center">
                      <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: barH }}>
                        {visibleProps.map((p, i) => {
                          const eq = snapshots[m]?.[p.id]?.equity || 0;
                          const segH = totalEquity > 0 ? (eq / totalEquity) * 100 : 0;
                          return (
                            <div key={p.id} className="w-full flex-shrink-0"
                                 style={{ height: `${segH}%`, background: COLORS[i % COLORS.length] + 'cc' }} />
                          );
                        })}
                      </div>
                      <div className="text-xs text-center text-slate-500 mt-2">{monthLabel(m)}</div>
                      <div className="text-xs text-center text-white font-medium">{fmtK(totalEquity)}</div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-44 bg-navy-900 border border-navy-600 rounded-lg p-2.5 text-xs shadow-lg pointer-events-none">
                        <div className="text-slate-300 font-medium mb-1.5">{monthLabel(m)}</div>
                        {visibleProps.map((p, i) => {
                          const snap = snapshots[m]?.[p.id];
                          if (!snap) return null;
                          return (
                            <div key={p.id} className="mb-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-slate-400 truncate">{p.name}</span>
                              </div>
                              <div className="pl-3.5 text-emerald-400">Equity: {fmtK(snap.equity)}</div>
                              {snap.mortgageBalance > 0 && <div className="pl-3.5 text-slate-500">Mortgage: {fmtK(snap.mortgageBalance)}</div>}
                              <div className="pl-3.5 text-slate-400">Value: {fmtK(snap.estimatedValue)}</div>
                            </div>
                          );
                        })}
                        <div className="flex justify-between font-semibold border-t border-navy-700 mt-1 pt-1 text-white">
                          <span>Total equity</span><span>{fmtK(totalEquity)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-navy-800 rounded-xl border border-navy-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
            <h2 className="font-semibold text-white">Recent Transactions</h2>
            <Link to="/transactions" className="text-emerald-400 text-xs flex items-center gap-1 hover:text-emerald-300">View all <ArrowUpRight size={12} /></Link>
          </div>
          <div className="divide-y divide-navy-700">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm text-white">{tx.description}</div>
                  <div className="text-xs text-slate-500">{tx.date} · {tx.category}</div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'Income' ? '+' : '-'}{fmtFull(tx.amount)}
                </span>
              </div>
            ))}
            {recentTransactions.length === 0 && <div className="px-5 py-8 text-center text-slate-500 text-sm">No transactions yet</div>}
          </div>
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
            <h2 className="font-semibold text-white">Properties</h2>
            <Link to="/properties" className="text-emerald-400 text-xs flex items-center gap-1 hover:text-emerald-300">View all <ArrowUpRight size={12} /></Link>
          </div>
          <div className="divide-y divide-navy-700">
            {sortByStreetName(properties.filter(p => !filterProperty || p.id === filterProperty)).map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm text-white">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.type} · {p.bedrooms}bd / {p.bathrooms}ba</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-emerald-400">{fmtFull(p.monthlyRent)}/mo</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'Occupied' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{p.status}</span>
                </div>
              </div>
            ))}
            {properties.length === 0 && <div className="px-5 py-8 text-center text-slate-500 text-sm">No properties yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

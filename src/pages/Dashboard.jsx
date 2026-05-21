import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, TrendingUp, TrendingDown, DollarSign, ArrowUpRight } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleProperties, sampleTenants, sampleTransactions, samplePropertyTaxes } from '../data/sampleData';

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    red: 'text-red-400 bg-red-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
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
  const [properties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [tenants] = useLocalStorage('lfjh_tenants', sampleTenants);
  const [transactions] = useLocalStorage('lfjh_transactions', sampleTransactions);
  const [propertyTaxes] = useLocalStorage('lfjh_property_taxes', samplePropertyTaxes);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const thisMonthTx = transactions.filter(tx => tx.date.startsWith(currentMonth));
    const income = thisMonthTx.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const expenses = thisMonthTx.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const occupied = properties.filter(p => p.status === 'Occupied').length;
    const activeTenants = tenants.filter(t => t.status === 'Active').length;
    const unpaidTaxes = propertyTaxes.filter(t => !t.paid).reduce((s, t) => s + t.annualAmount, 0);
    return { income, expenses, netCashflow: income - expenses, occupied, activeTenants, unpaidTaxes };
  }, [transactions, properties, tenants, propertyTaxes, currentMonth]);

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [transactions]
  );

  const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Property Finance Overview — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="col-span-1 xl:col-span-2"><StatCard icon={TrendingUp} label="Monthly Income" value={fmt(stats.income)} sub="This month" color="emerald" /></div>
        <div className="col-span-1 xl:col-span-2"><StatCard icon={TrendingDown} label="Monthly Expenses" value={fmt(stats.expenses)} sub="This month" color="red" /></div>
        <div className="col-span-1 xl:col-span-2"><StatCard icon={DollarSign} label="Net Cashflow" value={fmt(stats.netCashflow)} sub="This month" color={stats.netCashflow >= 0 ? 'emerald' : 'red'} /></div>
        <div className="col-span-1 xl:col-span-2"><StatCard icon={Building2} label="Properties" value={properties.length} sub={`${stats.occupied} occupied`} color="blue" /></div>
        <div className="col-span-1 xl:col-span-2"><StatCard icon={Users} label="Active Tenants" value={stats.activeTenants} sub={`of ${tenants.length} total`} color="blue" /></div>
        <div className="col-span-1 xl:col-span-2"><StatCard icon={DollarSign} label="Unpaid Taxes" value={fmt(stats.unpaidTaxes)} sub="Outstanding" color="yellow" /></div>
      </div>

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
                  {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount)}
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
            {properties.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm text-white">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.type} · {p.bedrooms}bd / {p.bathrooms}ba</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-emerald-400">{fmt(p.monthlyRent)}/mo</span>
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

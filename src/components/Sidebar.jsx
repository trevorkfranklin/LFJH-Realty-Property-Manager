import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Upload, Building2, DollarSign, TrendingUp, Users } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/properties', label: 'Properties', icon: Building2 },
  { to: '/property-taxes', label: 'Property Taxes', icon: DollarSign },
  { to: '/projected-cashflow', label: 'Projected Cashflow', icon: TrendingUp },
  { to: '/tenants', label: 'Tenants', icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-navy-900 flex flex-col flex-shrink-0 border-r border-navy-700">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-navy-700">
        <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 size={22} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-white text-base leading-tight">LFJH Realty</div>
          <div className="text-slate-400 text-xs">Property Finance</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-navy-700 text-emerald-400' : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`
            }>
            <Icon size={18} />{label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

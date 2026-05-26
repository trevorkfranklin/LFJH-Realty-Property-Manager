import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Upload, Building2, DollarSign, TrendingUp, Users, Home, LogOut, ShieldCheck, Bell, MessageSquare, UserCheck, HardDriveDownload } from 'lucide-react';
import { useNotificationCount } from '../pages/Notifications';
import { useAuth } from '../context/Auth';
import { useAppData } from '../context/AppData';
import { usePropertyFilter } from '../context/PropertyFilter';
import { sortByStreetName } from '../utils/sort';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/properties', label: 'Properties', icon: Building2 },
  { to: '/property-taxes', label: 'Property Taxes', icon: DollarSign },
  { to: '/hoa-dues',      label: 'HOA Dues',        icon: Home },
  { to: '/projected-cashflow', label: 'Projected Cashflow', icon: TrendingUp },
  { to: '/tenants',       label: 'Tenants',         icon: Users },
  { to: '/owners',        label: 'Owners',          icon: UserCheck },
  { to: '/chat',          label: 'AI Assistant',    icon: MessageSquare },
  { to: '/notifications', label: 'Notifications',   icon: Bell },
  { to: '/users',         label: 'Users',           icon: ShieldCheck, adminOnly: true },
  { to: '/migrate',      label: 'Migrate Data',    icon: HardDriveDownload, adminOnly: true },
];

export default function Sidebar() {
  const { properties } = useAppData();
  const { filterProperty, setFilterProperty } = usePropertyFilter();
  const { session, profile, logout, isAdmin } = useAuth();
  const pendingCount = useNotificationCount();
  const location = useLocation();
  const onImport = location.pathname === '/import';

  return (
    <aside className="w-64 h-screen flex flex-col flex-shrink-0 bg-navy-900 border-r border-navy-700">
      <div className="flex items-center justify-center px-4 py-3 border-b border-navy-700 flex-shrink-0">
        <div className="bg-white rounded-xl px-3 py-1.5">
          <img src="/logo.png" alt="LT²D Realty, LLC" className="h-12 w-auto object-contain" />
        </div>
      </div>

      {session && (
        <div className="px-3 pb-2 border-t border-navy-700 pt-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-white font-medium truncate">{session.user.email}</div>
            <div className="text-xs text-slate-500">{profile?.role === 'admin' ? 'Admin' : 'Viewer'}</div>
          </div>
          <button onClick={logout} title="Sign out" className="text-slate-500 hover:text-red-400 flex-shrink-0 ml-2">
            <LogOut size={15} />
          </button>
        </div>
      )}

      {!onImport && properties.length > 0 && (
        <div className="px-3 py-3 border-b border-navy-700 flex-shrink-0">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 px-1">Property Filter</div>
          <select
            value={filterProperty}
            onChange={e => setFilterProperty(e.target.value)}
            className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Properties</option>
            {sortByStreetName(properties).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {filterProperty && (
            <button
              onClick={() => setFilterProperty('')}
              className="mt-1 w-full text-xs text-slate-500 hover:text-slate-300 text-center"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-navy-700 text-emerald-400' : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`
            }>
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {to === '/notifications' && pendingCount > 0 && (
              <span className="bg-yellow-400 text-navy-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

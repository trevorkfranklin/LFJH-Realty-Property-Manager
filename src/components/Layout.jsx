import Sidebar from './Sidebar';
import { PropertyFilterProvider } from '../context/PropertyFilter';
import { useAutoSimpleFINSync } from '../hooks/useAutoSimpleFINSync';
import { useAutoBalanceSync } from '../hooks/useAutoBalanceSync';
import { useEquitySnapshot } from '../hooks/useEquitySnapshot';
import { Check, AlertCircle, RefreshCw } from 'lucide-react';

function SyncBanner() {
  const status = useAutoSimpleFINSync();
  useAutoBalanceSync();
  useEquitySnapshot();
  if (!status) return null;

  if (status === 'syncing') return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-navy-800 border border-navy-600 text-slate-300 text-sm px-4 py-2.5 rounded-lg shadow-lg">
      <RefreshCw size={14} className="animate-spin text-emerald-400" />
      Auto-syncing SimpleFIN…
    </div>
  );

  if (status.error) return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-navy-800 border border-red-500/40 text-red-400 text-sm px-4 py-2.5 rounded-lg shadow-lg">
      <AlertCircle size={14} />
      Auto-sync failed: {status.error}
    </div>
  );

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-navy-800 border border-emerald-500/40 text-emerald-400 text-sm px-4 py-2.5 rounded-lg shadow-lg">
      <Check size={14} />
      {status.added === 0
        ? 'Auto-sync complete — no new transactions'
        : `Auto-sync complete — ${status.added} new transaction${status.added !== 1 ? 's' : ''} added`}
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <PropertyFilterProvider>
      <div className="flex h-screen overflow-hidden bg-navy-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-900">{children}</main>
      </div>
      <SyncBanner />
    </PropertyFilterProvider>
  );
}

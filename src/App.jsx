import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/Auth';
import Login from './pages/Login';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Import from './pages/Import';
import Properties from './pages/Properties';
import PropertyTaxes from './pages/PropertyTaxes';
import HOADues from './pages/HOADues';
import ProjectedCashflow from './pages/ProjectedCashflow';
import Tenants from './pages/Tenants';
import Owners from './pages/Owners';

function useFixPropertyNames() {
  useEffect(() => {
    try {
      const props = JSON.parse(localStorage.getItem('lfjh_properties') || '[]');
      const fixed = props.map(p =>
        p.name === '21310 Highland Knolls'
          ? { ...p, name: '21310 Highland Knolls Dr', address: '21310 Highland Knolls Dr, Katy, TX 77450' }
          : p
      );
      if (fixed.some((p, i) => p.name !== props[i].name)) {
        localStorage.setItem('lfjh_properties', JSON.stringify(fixed));
      }
    } catch { /* non-fatal */ }
  }, []);
}

function useDeduplicateTransactions() {
  useEffect(() => {
    if (localStorage.getItem('lfjh_dedup_v3')) return;
    try {
      const txs = JSON.parse(localStorage.getItem('lfjh_transactions') || '[]');
      const score = t => (t.category ? 1 : 0) + (t.propertyId ? 1 : 0) + (t.categorized ? 1 : 0);

      // Group by date+amount (no type — credit card payments differ between SimpleFIN and CSV)
      const seen = new Map();
      const deduped = [];
      for (const tx of txs) {
        const key = `${tx.date}|${Number(tx.amount)}`;
        if (seen.has(key)) {
          if (score(tx) > score(seen.get(key).tx)) {
            deduped[seen.get(key).idx] = tx;
            seen.set(key, { tx, idx: seen.get(key).idx });
          }
        } else {
          seen.set(key, { tx, idx: deduped.length });
          deduped.push(tx);
        }
      }

      localStorage.setItem('lfjh_dedup_v3', '1');
      if (deduped.length !== txs.length) {
        localStorage.setItem('lfjh_transactions', JSON.stringify(deduped));
        window.location.reload();
      }
    } catch {
      localStorage.setItem('lfjh_dedup_v2', '1');
    }
  }, []);
}

function useRemoveNonChaseTransactions() {
  useEffect(() => {
    if (localStorage.getItem('lfjh_nonchase_cleaned')) return;
    const rawUrl = localStorage.getItem('lfjh_simplefin_url');
    if (!rawUrl) { localStorage.setItem('lfjh_nonchase_cleaned', '1'); return; }

    async function cleanup() {
      try {
        const accessUrl = JSON.parse(rawUrl);
        const u    = new URL(accessUrl);
        const auth = btoa(`${u.username}:${u.password}`);
        const base = `${u.protocol}//${u.host}${u.pathname}`;
        const since = new Date();
        since.setDate(since.getDate() - 1);
        const startTs = Math.floor(since.getTime() / 1000);

        const res = await fetch(`${base}/accounts?start-date=${startTs}`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        if (!res.ok) throw new Error('API error');

        const data = await res.json();
        const nonChaseNames = new Set(
          (data.accounts || [])
            .filter(a => !a.org?.name?.toLowerCase().includes('chase'))
            .map(a => a.name)
        );

        const txs = JSON.parse(localStorage.getItem('lfjh_transactions') || '[]');
        const cleaned = txs.filter(t => {
          if (!t.notes?.startsWith('SimpleFIN — ')) return true;
          return !nonChaseNames.has(t.notes.slice('SimpleFIN — '.length));
        });

        localStorage.setItem('lfjh_nonchase_cleaned', '1');
        if (cleaned.length !== txs.length) {
          localStorage.setItem('lfjh_transactions', JSON.stringify(cleaned));
          window.location.reload();
        }
      } catch {
        localStorage.setItem('lfjh_nonchase_cleaned', '1');
      }
    }

    cleanup();
  }, []);
}

function useSeedTenants() {
  useEffect(() => {
    if (localStorage.getItem('lfjh_seed_brown_v2')) return;
    try {
      const props = JSON.parse(localStorage.getItem('lfjh_properties') || '[]');
      const prop = props.find(p => p.name?.includes('21226 Highland Knolls'));
      if (!prop) return;
      const tenants = JSON.parse(localStorage.getItem('lfjh_tenants') || '[]');
      const alreadyMerged = tenants.some(t => t.firstName === 'John' && t.lastName === 'Brown' && t.coTenants?.length > 0);
      if (alreadyMerged) { localStorage.setItem('lfjh_seed_brown_v2', '1'); return; }
      const updated = [
        ...tenants.filter(t => !(t.firstName === 'John' && t.lastName === 'Brown') && !(t.firstName === 'Maria' && t.lastName === 'Brown')),
        {
          id: crypto.randomUUID(),
          firstName: 'John', lastName: 'Brown',
          email: 'brownj86@yahoo.com', phone: '918-924-6531',
          coTenants: [{ id: crypto.randomUUID(), firstName: 'Maria', lastName: 'Brown', email: 'misspanama86@gmail.com', phone: '254-833-7590' }],
          propertyId: prop.id, leaseStart: '', leaseEnd: '2026-05-31',
          monthlyRent: 2125, depositPaid: 2050, petDeposit: 0,
          status: 'Active', notes: '',
        },
      ];
      localStorage.setItem('lfjh_tenants', JSON.stringify(updated));
      localStorage.setItem('lfjh_seed_brown_v2', '1');
      window.location.reload();
    } catch { /* non-fatal */ }
  }, []);
}

function AppRoutes() {
  useFixPropertyNames();
  useDeduplicateTransactions();
  useRemoveNonChaseTransactions();
  useSeedTenants();
  const { session, needsSetup } = useAuth();

  if (!session || needsSetup) return <Login />;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/import" element={<Import />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/property-taxes" element={<PropertyTaxes />} />
          <Route path="/hoa-dues" element={<HOADues />} />
          <Route path="/projected-cashflow" element={<ProjectedCashflow />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/users" element={<Users />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

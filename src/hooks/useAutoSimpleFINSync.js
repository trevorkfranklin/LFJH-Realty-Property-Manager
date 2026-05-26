import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { sampleTransactions } from '../data/sampleData';

export function useAutoSimpleFINSync() {
  const [sfAccessUrl]   = useLocalStorage('lfjh_simplefin_url', '');
  const [transactions, setTransactions] = useLocalStorage('lfjh_transactions', sampleTransactions);
  const [lastSyncDate, setLastSyncDate] = useLocalStorage('lfjh_auto_sync_date', '');
  const [status, setStatus] = useState(null); // null | 'syncing' | { added: n } | { error: string }

  useEffect(() => {
    if (!sfAccessUrl) return;
    const today = new Date().toISOString().slice(0, 10);
    if (lastSyncDate === today) return;
    runSync(sfAccessUrl, transactions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfAccessUrl]);  // re-check only when the access URL changes (e.g. user just connected)

  async function runSync(accessUrl, currentTxs) {
    setStatus('syncing');
    try {
      const u    = new URL(accessUrl);
      const auth = btoa(`${u.username}:${u.password}`);
      const base = `${u.protocol}//${u.host}${u.pathname}`;

      const since = new Date();
      since.setDate(since.getDate() - 90);
      const startTs = Math.floor(since.getTime() / 1000);

      const res = await fetch(`${base}/accounts?start-date=${startTs}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) throw new Error(`SimpleFIN API error (${res.status})`);
      const data = await res.json();

      const chaseAccounts = (data.accounts || []).filter(a => a.org?.name?.toLowerCase().includes('chase'));
      const fetched = chaseAccounts.flatMap(acct =>
        (acct.transactions || []).map(tx => {
          const amount = parseFloat(tx.amount);
          return {
            id: crypto.randomUUID(),
            sfTxId: tx.id,   // store SimpleFIN's own transaction ID
            date: new Date(tx.posted * 1000).toISOString().slice(0, 10),
            description: tx.description || tx.memo || 'Bank transaction',
            amount: Math.abs(amount),
            type: amount >= 0 ? 'Income' : 'Expense',
            category: '',
            propertyId: '',
            notes: `SimpleFIN — ${acct.name}`,
          };
        })
      );

      // Dedup: SF id → exact fingerprint → date+amount cross-source fallback (type excluded
      // because credit card payments show as Income in SimpleFIN but Expense in CSV exports)
      const existingSfIds    = new Set(currentTxs.filter(t => t.sfTxId).map(t => t.sfTxId));
      const existingFullKeys = new Set(currentTxs.map(t => `${t.date}|${t.description}|${Number(t.amount)}|${t.type}`));
      const existingDAKeys   = new Set(currentTxs.map(t => `${t.date}|${Number(t.amount)}`));
      const fresh = fetched.filter(tx =>
        !existingSfIds.has(tx.sfTxId) &&
        !existingFullKeys.has(`${tx.date}|${tx.description}|${Number(tx.amount)}|${tx.type}`) &&
        !existingDAKeys.has(`${tx.date}|${Number(tx.amount)}`)
      );

      if (fresh.length > 0) setTransactions(prev => [...prev, ...fresh]);
      setLastSyncDate(new Date().toISOString().slice(0, 10));
      setStatus({ added: fresh.length });
    } catch (e) {
      setStatus({ error: e.message });
    } finally {
      setTimeout(() => setStatus(null), 6000);
    }
  }

  return status;
}

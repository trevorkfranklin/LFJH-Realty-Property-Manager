import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { supabase } from '../lib/supabase';
import { useAppData } from '../context/AppData';

export function useAutoSimpleFINSync() {
  const { settings, setTransactionsRaw } = useAppData();
  const sfAccessUrl = settings?.simplefin_url || '';
  const [lastSyncDate, setLastSyncDate] = useLocalStorage('lfjh_auto_sync_date', '');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!sfAccessUrl) return;
    const today = new Date().toISOString().slice(0, 10);
    if (lastSyncDate === today) return;
    runSync(sfAccessUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfAccessUrl]);

  async function runSync(accessUrl) {
    setStatus('syncing');
    try {
      const u    = new URL(accessUrl);
      const auth = btoa(`${u.username}:${u.password}`);
      const base = `${u.protocol}//${u.host}${u.pathname}`;

      const since = new Date();
      since.setDate(since.getDate() - 90);
      const startTs = Math.floor(since.getTime() / 1000);
      const sinceDate = since.toISOString().slice(0, 10);

      const res = await fetch(`${base}/accounts?start-date=${startTs}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) throw new Error(`SimpleFIN API error (${res.status})`);
      const data = await res.json();

      const excludedSuffixes = ['6663', '5100', '9533'];
      let excludedIds = new Set();
      try { excludedIds = new Set(JSON.parse(settings?.simplefin_excluded_ids || '[]')); } catch {}
      const chaseAccounts = (data.accounts || []).filter(a =>
        a.org?.name?.toLowerCase().includes('chase') &&
        !excludedSuffixes.some(suffix => a.name?.includes(suffix)) &&
        !excludedIds.has(a.id)
      );
      const fetched = chaseAccounts.flatMap(acct =>
        (acct.transactions || []).map(tx => {
          const amount = parseFloat(tx.amount);
          return {
            id: crypto.randomUUID(),
            sf_tx_id: tx.id,
            date: new Date(tx.posted * 1000).toISOString().slice(0, 10),
            description: tx.description || tx.memo || 'Bank transaction',
            amount: Math.abs(amount),
            type: amount >= 0 ? 'Income' : 'Expense',
            category: null,
            property_id: null,
            owner_id: null,
            notes: `SimpleFIN — ${acct.name}`,
            splits: [],
            rent_periods: [],
            excluded: false,
            categorized: false,
          };
        })
      );

      const { data: existing } = await supabase
        .from('transactions')
        .select('sf_tx_id, date, amount')
        .gte('date', sinceDate);

      const existingSfIds  = new Set((existing || []).filter(t => t.sf_tx_id).map(t => t.sf_tx_id));
      const existingDAKeys = new Set((existing || []).map(t => `${t.date}|${Number(t.amount)}`));

      const fresh = fetched.filter(tx =>
        !existingSfIds.has(tx.sf_tx_id) &&
        !existingDAKeys.has(`${tx.date}|${Number(tx.amount)}`)
      );

      if (fresh.length > 0) {
        await supabase.from('transactions').insert(fresh);
        const mapped = fresh.map(t => ({
          id: t.id, sfTxId: t.sf_tx_id || '',
          date: t.date, description: t.description,
          amount: Number(t.amount), type: t.type,
          category: t.category || '', propertyId: t.property_id || '',
          ownerId: t.owner_id || '', notes: t.notes || '',
          splits: [], rentPeriods: [],
          taxYear: null, taxType: '',
          excluded: false, categorized: false,
        }));
        setTransactionsRaw(prev => [...mapped, ...prev]);
      }

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

import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useAppData } from '../context/AppData';
import { fetchAccounts } from '../utils/simplefin';

export function useAutoBalanceSync() {
  const { settings }                   = useAppData();
  const sfAccessUrl                    = settings?.simplefin_url || '';
  const [, setSfAccounts]              = useLocalStorage('lfjh_simplefin_accounts_v2', {});
  const [lastSync, setLastSync]        = useLocalStorage('lfjh_balance_sync_date', '');

  useEffect(() => {
    if (!sfAccessUrl) return;

    const today   = new Date();
    const month   = today.toISOString().slice(0, 7);
    const isFirst = today.getDate() === 1;
    const stale   = lastSync.slice(0, 7) !== month;

    if (!lastSync || (isFirst && stale)) runSync();

    async function runSync() {
      try {
        const accounts = await fetchAccounts(sfAccessUrl, 30);
        const map = {};
        for (const acct of accounts) {
          map[acct.id] = {
            id:          acct.id,
            orgName:     acct.org?.name || 'Unknown',
            accountName: acct.name,
            balance:     Math.abs(parseFloat(acct.balance || 0)),
            fetchedAt:   today.toISOString().slice(0, 10),
          };
        }
        if (Object.keys(map).length > 0) {
          setSfAccounts(map);
          setLastSync(today.toISOString().slice(0, 10));
        }
      } catch { /* non-fatal */ }
    }
  }, [sfAccessUrl]); // eslint-disable-line react-hooks/exhaustive-deps
}

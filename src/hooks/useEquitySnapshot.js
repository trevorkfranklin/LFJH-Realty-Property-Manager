import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useAppData } from '../context/AppData';

export function useEquitySnapshot() {
  const { properties } = useAppData();
  const [rentcastData] = useLocalStorage('lfjh_rentcast', {});
  const [sfAccounts]   = useLocalStorage('lfjh_simplefin_accounts', {});
  const [, setSnapshots] = useLocalStorage('lfjh_equity_snapshots', {});

  useEffect(() => {
    if (!properties.length) return;
    const month = new Date().toISOString().slice(0, 7);
    const existing = JSON.parse(localStorage.getItem('lfjh_equity_snapshots') || '{}');
    if (existing[month]) return;

    const frame = {};
    for (const p of properties) {
      const rc = rentcastData[p.id];
      if (!rc?.estimatedValue) continue;
      const mortgageAcct = p.mortgageAccountId ? sfAccounts[p.mortgageAccountId] : null;
      const mortgageBalance = mortgageAcct?.balance || 0;
      frame[p.id] = {
        estimatedValue: rc.estimatedValue,
        mortgageBalance,
        equity: Math.max(rc.estimatedValue - mortgageBalance, 0),
      };
    }

    if (Object.keys(frame).length > 0) {
      setSnapshots(prev => ({ ...prev, [month]: frame }));
    }
  }, [properties, rentcastData, sfAccounts]); // eslint-disable-line react-hooks/exhaustive-deps
}

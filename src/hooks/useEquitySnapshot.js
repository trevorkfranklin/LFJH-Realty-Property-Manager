import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { sampleProperties } from '../data/sampleData';

// Captures a monthly equity snapshot (estimated value vs mortgage balance per property).
// Runs on every app load; only writes if the current month doesn't already have a snapshot
// AND both RentCast data and SimpleFIN account data are present.
export function useEquitySnapshot() {
  const [properties]   = useLocalStorage('lfjh_properties', sampleProperties);
  const [rentcastData] = useLocalStorage('lfjh_rentcast', {});
  const [sfAccounts]   = useLocalStorage('lfjh_simplefin_accounts', {});
  const [, setSnapshots] = useLocalStorage('lfjh_equity_snapshots', {});

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);

    // Check existing snapshots without triggering re-renders
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

import { useState } from 'react';
import { Database, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { propertyToDB, tenantToDB, txToDB, ownerToDB, taxToDB, hoaToDB } from '../lib/mappers';
import { useAppData } from '../context/AppData';

const KEYS = {
  properties:    'lfjh_properties',
  tenants:       'lfjh_tenants',
  transactions:  'lfjh_transactions',
  owners:        'lfjh_owners',
  propertyTaxes: 'lfjh_property_taxes',
  hoaDues:       'lfjh_hoa_dues',
};

function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') || []; }
  catch { return []; }
}

const ENTITY_LABELS = {
  properties:    'Properties',
  owners:        'Owners',
  tenants:       'Tenants',
  transactions:  'Transactions',
  propertyTaxes: 'Property Taxes',
  hoaDues:       'HOA Dues',
};

export default function MigrateData() {
  const { reload } = useAppData();
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState({});

  const alreadyMigrated = localStorage.getItem('lfjh_migrated') === 'true';

  const data = {
    properties:    readLS(KEYS.properties),
    tenants:       readLS(KEYS.tenants),
    transactions:  readLS(KEYS.transactions),
    owners:        readLS(KEYS.owners),
    propertyTaxes: readLS(KEYS.propertyTaxes),
    hoaDues:       readLS(KEYS.hoaDues),
  };
  const totalRecords = Object.values(data).reduce((s, a) => s + a.length, 0);

  const migrate = async () => {
    setStatus('running');
    const res = {};

    // Properties first (others reference them)
    if (data.properties.length) {
      const rows = data.properties.map(propertyToDB);
      const { error } = await supabase.from('properties').upsert(rows, { onConflict: 'id' });
      res.properties = error ? { error: error.message } : { count: rows.length };
    }

    // Owners (referenced by transactions)
    if (data.owners.length) {
      const rows = data.owners.map(ownerToDB);
      const { error } = await supabase.from('owners').upsert(rows, { onConflict: 'id' });
      res.owners = error ? { error: error.message } : { count: rows.length };
    }

    // Tenants
    if (data.tenants.length) {
      const rows = data.tenants.map(tenantToDB);
      const { error } = await supabase.from('tenants').upsert(rows, { onConflict: 'id' });
      res.tenants = error ? { error: error.message } : { count: rows.length };
    }

    // Transactions (batch in chunks of 500)
    if (data.transactions.length) {
      const rows = data.transactions.map(txToDB);
      let txError = null;
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from('transactions').upsert(rows.slice(i, i + 500), { onConflict: 'id' });
        if (error) { txError = error.message; break; }
      }
      res.transactions = txError ? { error: txError } : { count: rows.length };
    }

    // Property Taxes
    if (data.propertyTaxes.length) {
      const rows = data.propertyTaxes.map(taxToDB);
      const { error } = await supabase.from('property_taxes').upsert(rows, { onConflict: 'id' });
      res.propertyTaxes = error ? { error: error.message } : { count: rows.length };
    }

    // HOA Dues
    if (data.hoaDues.length) {
      const rows = data.hoaDues.map(hoaToDB);
      const { error } = await supabase.from('hoa_dues').upsert(rows, { onConflict: 'id' });
      res.hoaDues = error ? { error: error.message } : { count: rows.length };
    }

    setResults(res);
    const hasErrors = Object.values(res).some(r => r?.error);
    if (!hasErrors) {
      localStorage.setItem('lfjh_migrated', 'true');
      reload();
    }
    setStatus(hasErrors ? 'error' : 'done');
  };

  if (alreadyMigrated && status === 'idle') {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Migrate Local Data</h1>
        <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <Check size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-emerald-400 font-medium">Migration complete</p>
            <p className="text-slate-400 text-sm mt-0.5">Your local data was already migrated to Supabase.</p>
          </div>
        </div>
        <button
          onClick={() => { localStorage.removeItem('lfjh_migrated'); window.location.reload(); }}
          className="mt-4 text-xs text-slate-500 hover:text-slate-300"
        >
          Run migration again
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Migrate Local Data</h1>
      <p className="text-slate-400 text-sm mb-8">Copy everything stored in your browser's localStorage into the shared Supabase database.</p>

      {totalRecords === 0 ? (
        <div className="p-6 bg-navy-800 border border-navy-700 rounded-xl text-center text-slate-500">
          <Database size={36} className="mx-auto mb-3 opacity-30" />
          <p>No local data found.</p>
          <p className="text-xs mt-1">Your browser's localStorage has no LFJH app data to migrate.</p>
        </div>
      ) : (
        <>
          <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-navy-700 text-xs uppercase text-slate-400 font-medium">Found in localStorage</div>
            <div className="divide-y divide-navy-700">
              {Object.entries(data).filter(([, arr]) => arr.length > 0).map(([key, arr]) => (
                <div key={key} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-white">{ENTITY_LABELS[key]}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">{arr.length} record{arr.length !== 1 ? 's' : ''}</span>
                    {results[key] && (
                      results[key].error
                        ? <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {results[key].error}</span>
                        : <Check size={14} className="text-emerald-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-navy-700 text-xs text-slate-500">
              {totalRecords} total records will be upserted — existing Supabase records with matching IDs will be updated, new ones inserted.
            </div>
          </div>

          {status === 'done' && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400">
              <Check size={16} /> Migration complete — all data is now in Supabase.
            </div>
          )}

          {status === 'error' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} /> Some entities failed — check the errors above. Make sure you've run <code className="font-mono text-xs bg-navy-700 px-1 rounded">supabase-migration-2.sql</code> in Supabase first.
            </div>
          )}

          {status !== 'done' && (
            <button
              onClick={migrate}
              disabled={status === 'running'}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              <RefreshCw size={14} className={status === 'running' ? 'animate-spin' : ''} />
              {status === 'running' ? 'Migrating…' : `Migrate ${totalRecords} Records to Supabase`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

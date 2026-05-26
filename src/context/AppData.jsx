import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  propertyFromDB, propertyToDB,
  tenantFromDB,   tenantToDB,
  txFromDB,       txToDB,
  ownerFromDB,    ownerToDB,
  taxFromDB,      taxToDB,
  hoaFromDB,      hoaToDB,
} from '../lib/mappers';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [properties,   setProperties]   = useState([]);
  const [tenants,      setTenants]      = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [owners,       setOwners]       = useState([]);
  const [propertyTaxes,setPropertyTaxes]= useState([]);
  const [hoaDues,      setHoaDues]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    return Promise.all([
      supabase.from('properties').select('*').order('name'),
      supabase.from('tenants').select('*'),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('owners').select('*').order('last_name'),
      supabase.from('property_taxes').select('*').order('tax_year', { ascending: false }),
      supabase.from('hoa_dues').select('*').order('year', { ascending: false }),
    ]).then(([p, t, tx, o, pt, hoa]) => {
      setProperties((p.data   || []).map(propertyFromDB));
      setTenants(   (t.data   || []).map(tenantFromDB));
      setTransactions((tx.data|| []).map(txFromDB));
      setOwners(    (o.data   || []).map(ownerFromDB));
      setPropertyTaxes((pt.data||[]).map(taxFromDB));
      setHoaDues(   (hoa.data || []).map(hoaFromDB));
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Properties ──────────────────────────────────────────────────────────────
  const addProperty = useCallback(async (p) => {
    const { error } = await supabase.from('properties').insert(propertyToDB(p));
    if (!error) setProperties(prev => [...prev, p]);
    return { error };
  }, []);

  const updateProperty = useCallback(async (p) => {
    const { error } = await supabase.from('properties').update(propertyToDB(p)).eq('id', p.id);
    if (!error) setProperties(prev => prev.map(x => x.id === p.id ? p : x));
    return { error };
  }, []);

  const deleteProperty = useCallback(async (id) => {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (!error) setProperties(prev => prev.filter(x => x.id !== id));
    return { error };
  }, []);

  // ── Tenants ─────────────────────────────────────────────────────────────────
  const addTenant = useCallback(async (t) => {
    const { error } = await supabase.from('tenants').insert(tenantToDB(t));
    if (!error) setTenants(prev => [...prev, t]);
    return { error };
  }, []);

  const updateTenant = useCallback(async (t) => {
    const { error } = await supabase.from('tenants').update(tenantToDB(t)).eq('id', t.id);
    if (!error) setTenants(prev => prev.map(x => x.id === t.id ? t : x));
    return { error };
  }, []);

  const deleteTenant = useCallback(async (id) => {
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (!error) setTenants(prev => prev.filter(x => x.id !== id));
    return { error };
  }, []);

  // ── Transactions ─────────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx) => {
    const { error } = await supabase.from('transactions').insert(txToDB(tx));
    if (!error) setTransactions(prev => [tx, ...prev]);
    return { error };
  }, []);

  const updateTransaction = useCallback(async (tx) => {
    const { error } = await supabase.from('transactions').update(txToDB(tx)).eq('id', tx.id);
    if (!error) setTransactions(prev => prev.map(x => x.id === tx.id ? tx : x));
    return { error };
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(prev => prev.filter(x => x.id !== id));
    return { error };
  }, []);

  const bulkAddTransactions = useCallback(async (newTxs) => {
    if (!newTxs.length) return { added: 0 };
    const { error } = await supabase.from('transactions').insert(newTxs.map(txToDB));
    if (!error) setTransactions(prev => [...newTxs, ...prev]);
    return { error, added: error ? 0 : newTxs.length };
  }, []);

  // Updates a single field on many transactions (used for auto-sync additions)
  const setTransactionsRaw = useCallback((updater) => {
    setTransactions(updater);
  }, []);

  // ── Owners ───────────────────────────────────────────────────────────────────
  const addOwner = useCallback(async (o) => {
    const { error } = await supabase.from('owners').insert(ownerToDB(o));
    if (!error) setOwners(prev => [...prev, o]);
    return { error };
  }, []);

  const updateOwner = useCallback(async (o) => {
    const { error } = await supabase.from('owners').update(ownerToDB(o)).eq('id', o.id);
    if (!error) setOwners(prev => prev.map(x => x.id === o.id ? o : x));
    return { error };
  }, []);

  const deleteOwner = useCallback(async (id) => {
    const { error } = await supabase.from('owners').delete().eq('id', id);
    if (!error) setOwners(prev => prev.filter(x => x.id !== id));
    return { error };
  }, []);

  // ── Property Taxes ───────────────────────────────────────────────────────────
  const addPropertyTax = useCallback(async (t) => {
    const { error } = await supabase.from('property_taxes').insert(taxToDB(t));
    if (!error) setPropertyTaxes(prev => [...prev, t]);
    return { error };
  }, []);

  const updatePropertyTax = useCallback(async (t) => {
    const { error } = await supabase.from('property_taxes').update(taxToDB(t)).eq('id', t.id);
    if (!error) setPropertyTaxes(prev => prev.map(x => x.id === t.id ? t : x));
    return { error };
  }, []);

  const deletePropertyTax = useCallback(async (id) => {
    const { error } = await supabase.from('property_taxes').delete().eq('id', id);
    if (!error) setPropertyTaxes(prev => prev.filter(x => x.id !== id));
    return { error };
  }, []);

  // ── HOA Dues ─────────────────────────────────────────────────────────────────
  const addHoaDue = useCallback(async (h) => {
    const { error } = await supabase.from('hoa_dues').insert(hoaToDB(h));
    if (!error) setHoaDues(prev => [...prev, h]);
    return { error };
  }, []);

  const updateHoaDue = useCallback(async (h) => {
    const { error } = await supabase.from('hoa_dues').update(hoaToDB(h)).eq('id', h.id);
    if (!error) setHoaDues(prev => prev.map(x => x.id === h.id ? h : x));
    return { error };
  }, []);

  const deleteHoaDue = useCallback(async (id) => {
    const { error } = await supabase.from('hoa_dues').delete().eq('id', id);
    if (!error) setHoaDues(prev => prev.filter(x => x.id !== id));
    return { error };
  }, []);

  return (
    <AppDataContext.Provider value={{
      properties, tenants, transactions, owners, propertyTaxes, hoaDues, loading, reload: fetchAll,
      addProperty, updateProperty, deleteProperty,
      addTenant, updateTenant, deleteTenant,
      addTransaction, updateTransaction, deleteTransaction, bulkAddTransactions, setTransactionsRaw,
      addOwner, updateOwner, deleteOwner,
      addPropertyTax, updatePropertyTax, deletePropertyTax,
      addHoaDue, updateHoaDue, deleteHoaDue,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);

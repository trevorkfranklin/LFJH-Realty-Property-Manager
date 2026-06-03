import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check, Building2, RefreshCw, TrendingUp, Landmark, Camera } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { PROPERTY_TYPES } from '../data/sampleData';
import { usePropertyFilter } from '../context/PropertyFilter';
import { useAuth } from '../context/Auth';
import { useAppData } from '../context/AppData';
import { fetchPropertyEstimates } from '../utils/rentcast';
import { fetchAccounts } from '../utils/simplefin';
import { sortByStreetName } from '../utils/sort';
import { savePropertyPhoto, getPropertyPhotoUrl, deletePropertyPhoto } from '../hooks/useDocuments';

function PropertyPhoto({ propertyId }) {
  const [url, setUrl]       = useState(null);
  const [hover, setHover]   = useState(false);
  const fileRef             = useRef();

  useEffect(() => {
    let objectUrl;
    getPropertyPhotoUrl(propertyId).then(u => {
      objectUrl = u;
      setUrl(u);
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [propertyId]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    await savePropertyPhoto(propertyId, file);
    if (url) URL.revokeObjectURL(url);
    const newUrl = await getPropertyPhotoUrl(propertyId);
    setUrl(newUrl);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = async (ev) => {
    ev.stopPropagation();
    await deletePropertyPhoto(propertyId);
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
  };

  return (
    <div
      className="relative -mx-5 -mt-5 mb-4 cursor-pointer overflow-hidden rounded-t-xl"
      style={{ height: url ? 140 : 56 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => fileRef.current?.click()}
    >
      {url ? (
        <>
          <img src={url} alt="Property" className="w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity ${hover ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-white text-xs flex items-center gap-1"><Camera size={13} /> Change photo</span>
            <button
              onClick={handleRemove}
              className="text-white/70 hover:text-red-400 text-xs flex items-center gap-1"
            >
              <X size={13} /> Remove
            </button>
          </div>
        </>
      ) : (
        <div className={`flex items-center justify-center h-full bg-navy-900 border-b border-navy-700 transition-colors ${hover ? 'bg-navy-700' : ''}`}>
          <span className="text-slate-500 text-xs flex items-center gap-1.5"><Camera size={13} /> Add property photo</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

const EMPTY = { id: '', name: '', address: '', type: 'Single Family', purchasePrice: '', monthlyRent: '', bedrooms: '', bathrooms: '', sqft: '', status: 'Occupied', notes: '', mortgageAccountId: '', hoa: '', hoaUrl: '', mudDistrict: '', mudUrl: '' };

function Modal({ title, form, setForm, onSave, onClose, sfAccounts }) {
  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white';
  const accountOptions = Object.values(sfAccounts);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Property Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 123 Oak Street" className={inputCls} /></div>
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Full Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Oak Street, City, ST 00000" className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Property Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label className="text-xs text-slate-400 block mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}><option>Occupied</option><option>Vacant</option><option>Maintenance</option></select></div>
          <div><label className="text-xs text-slate-400 block mb-1">Purchase Price ($)</label><input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Monthly Rent ($)</label><input type="number" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Bedrooms</label><input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Bathrooms</label><input type="number" step="0.5" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Sq Ft</label><input type="number" value={form.sqft} onChange={e => setForm({ ...form, sqft: e.target.value })} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">HOA Name</label><input value={form.hoa || ''} onChange={e => setForm({ ...form, hoa: e.target.value })} placeholder="e.g. Cinco Ranch HOA" className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">HOA Website</label><input type="url" value={form.hoaUrl || ''} onChange={e => setForm({ ...form, hoaUrl: e.target.value })} placeholder="https://..." className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">MUD District</label><input value={form.mudDistrict || ''} onChange={e => setForm({ ...form, mudDistrict: e.target.value })} placeholder="e.g. Fort Bend MUD #23" className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">MUD Website</label><input type="url" value={form.mudUrl || ''} onChange={e => setForm({ ...form, mudUrl: e.target.value })} placeholder="https://..." className={inputCls} /></div>
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400 block mb-1">Mortgage Account (SimpleFIN)</label>
            {accountOptions.length > 0 ? (
              <select value={form.mortgageAccountId || ''} onChange={e => setForm({ ...form, mortgageAccountId: e.target.value })} className={inputCls}>
                <option value="">— None —</option>
                {accountOptions.map(a => (
                  <option key={a.id} value={a.id}>{a.orgName} — {a.accountName}</option>
                ))}
              </select>
            ) : (
              <div className={`${inputCls} text-slate-500 italic`}>No accounts synced — click Sync Balances first</div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Check size={14} /> Save</button>
        </div>
      </div>
    </div>
  );
}

export default function Properties() {
  const { properties, addProperty, updateProperty, deleteProperty, tenants } = useAppData();
  const [rentcastData, setRentcastData] = useLocalStorage('lfjh_rentcast', {});
  const [sfAccounts, setSfAccounts]     = useLocalStorage('lfjh_simplefin_accounts_v2', {});
  const [mortgageSyncDate, setMortgageSyncDate] = useLocalStorage('lfjh_mortgage_sync_date', '');
  const [sfAccessUrl]   = useLocalStorage('lfjh_simplefin_url', '');
  const { filterProperty } = usePropertyFilter();
  const { canEdit } = useAuth();
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState(EMPTY);
  const [syncing, setSyncing]         = useState(false);
  const [syncingId, setSyncingId]     = useState(null);
  const [balanceSyncing, setBalanceSyncing] = useState(false);

  const visibleProperties = sortByStreetName(filterProperty ? properties.filter(p => p.id === filterProperty) : properties);
  const fmt      = (n) => n ? '$' + Number(n).toLocaleString() : '—';
  const fmtRange = (lo, hi) => lo && hi ? `$${Number(lo).toLocaleString()} – $${Number(hi).toLocaleString()}` : null;
  const activeTenant = (propId) => tenants.find(t => t.propertyId === propId && t.status === 'Active');

  // ── RentCast ──────────────────────────────────────────────────────────────
  const syncAll = useCallback(async () => {
    setSyncing(true);
    const updates = { ...rentcastData };
    for (const p of properties) {
      if (!p.address) continue;
      setSyncingId(p.id);
      try { updates[p.id] = await fetchPropertyEstimates(p.address); } catch { /* keep old */ }
    }
    setRentcastData(updates);
    setSyncing(false);
    setSyncingId(null);
  }, [properties, rentcastData, setRentcastData]);

  async function syncOne(p) {
    if (!p.address) return;
    setSyncingId(p.id);
    try { setRentcastData(prev => ({ ...prev, [p.id]: {} }));
      const result = await fetchPropertyEstimates(p.address);
      setRentcastData(prev => ({ ...prev, [p.id]: result }));
    } catch { /* keep old */ }
    setSyncingId(null);
  }

  useEffect(() => {
    if (!properties.length) return;
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const hasNoData = properties.some(p => !rentcastData[p.id]);
    const isFirstOfMonth = today.getDate() === 1;
    const dataIsStale = isFirstOfMonth && properties.some(p => {
      const fetched = rentcastData[p.id]?.fetchedAt;
      return !fetched || fetched.slice(0, 7) !== currentMonth;
    });
    if (hasNoData || dataIsStale) syncAll();
  }, [properties.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SimpleFIN mortgage balances ───────────────────────────────────────────
  const syncMortgageBalances = useCallback(async () => {
    if (!sfAccessUrl) return;
    setBalanceSyncing(true);
    try {
      const accounts = await fetchAccounts(sfAccessUrl, 30);
      const map = {};
      for (const acct of accounts) {
        map[acct.id] = {
          id:          acct.id,
          orgName:     acct.org?.name || 'Unknown',
          accountName: acct.name,
          balance:     Math.abs(parseFloat(acct.balance || 0)),
          fetchedAt:   new Date().toISOString().slice(0, 10),
        };
      }
      if (Object.keys(map).length > 0) {
        setSfAccounts(map);
        setMortgageSyncDate(new Date().toISOString().slice(0, 10));
      }
    } catch (e) {
      console.error('Mortgage balance sync failed:', e);
    } finally {
      setBalanceSyncing(false);
    }
  }, [sfAccessUrl, setSfAccounts, setMortgageSyncDate]);

  // Auto-sync: immediately if no account data, or on 1st of month if stale
  useEffect(() => {
    if (!sfAccessUrl) return;
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const hasNoData = Object.keys(sfAccounts).length === 0;
    const isFirstOfMonth = today.getDate() === 1;
    const dataIsStale = isFirstOfMonth && mortgageSyncDate.slice(0, 7) !== currentMonth;
    if (hasNoData || dataIsStale) syncMortgageBalances();
  }, [sfAccessUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openAdd  = () => { setForm({ ...EMPTY, id: crypto.randomUUID() }); setModal('add'); };
  const openEdit = (p) => { setForm({ ...p, mortgageAccountId: p.mortgageAccountId || '', hoa: p.hoa || '', hoaUrl: p.hoaUrl || '', mudDistrict: p.mudDistrict || '', mudUrl: p.mudUrl || '' }); setModal('edit'); };
  const save = () => {
    if (!form.name) return;
    const record = { ...form, purchasePrice: Number(form.purchasePrice), monthlyRent: Number(form.monthlyRent), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), sqft: Number(form.sqft) };
    if (modal === 'add') addProperty(record);
    else updateProperty(record);
    setModal(null);
  };
  const remove = (id) => { if (confirm('Delete this property?')) deleteProperty(id); };
  const statusColor = (s) => ({ Occupied: 'bg-emerald-400/10 text-emerald-400', Vacant: 'bg-yellow-400/10 text-yellow-400', Maintenance: 'bg-red-400/10 text-red-400' }[s] || 'bg-slate-400/10 text-slate-400');
  const totalMonthlyRent = properties.reduce((s, p) => {
    const t = activeTenant(p.id);
    return s + (t ? Number(t.monthlyRent) : 0);
  }, 0);

  return (
    <div className="p-8">
      {modal && <Modal title={modal === 'add' ? 'Add Property' : 'Edit Property'} form={form} setForm={setForm} onSave={save} onClose={() => setModal(null)} sfAccounts={sfAccounts} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-slate-400 text-sm mt-1">{visibleProperties.length} propert{visibleProperties.length !== 1 ? 'ies' : 'y'} · {fmt(totalMonthlyRent)}/mo gross rent</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && sfAccessUrl && (
            <button onClick={syncMortgageBalances} disabled={balanceSyncing} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <RefreshCw size={14} className={balanceSyncing ? 'animate-spin' : ''} />
              {balanceSyncing ? 'Syncing Balances…' : 'Sync Balances'}
            </button>
          )}
          {canEdit && (
            <button onClick={syncAll} disabled={syncing} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing RentCast…' : 'Sync RentCast'}
            </button>
          )}
          {canEdit && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Property</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleProperties.map(p => {
          const rc  = rentcastData[p.id];
          const isSyncingRc = syncingId === p.id;
          const mortgageAcct = p.mortgageAccountId ? sfAccounts[p.mortgageAccountId] : null;
          const tenant = activeTenant(p.id);
          const monthlyRent = tenant ? Number(tenant.monthlyRent) : null;

          return (
            <div key={p.id} className="bg-navy-800 rounded-xl border border-navy-700 p-5">
              <PropertyPhoto propertyId={p.id} />
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-400/10 rounded-lg flex items-center justify-center flex-shrink-0"><Building2 size={18} className="text-emerald-400" /></div>
                  <div><div className="font-semibold text-white text-sm">{p.name}</div><div className="text-xs text-slate-500">{p.type}</div></div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
              </div>
              <div className="text-xs text-slate-500 mb-3">{p.address}</div>
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-navy-900 rounded-lg p-2">
                  <div className="text-slate-500">Monthly Rent</div>
                  <div className="text-emerald-400 font-semibold">{monthlyRent ? fmt(monthlyRent) : '—'}</div>
                  {tenant && <div className="text-slate-600 mt-0.5 truncate">{tenant.firstName} {tenant.lastName}</div>}
                </div>
                <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Purchase Price</div><div className="text-white font-semibold">{fmt(p.purchasePrice)}</div></div>
                <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Beds / Baths</div><div className="text-white">{p.bedrooms} bd / {p.bathrooms} ba</div></div>
                <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Sq Ft</div><div className="text-white">{p.sqft ? p.sqft.toLocaleString() : '—'}</div></div>
              </div>
              {(p.hoa || p.mudDistrict) && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mb-3">
                  {p.hoa && (
                    <span>
                      <span className="text-slate-600">HOA: </span>
                      {p.hoaUrl
                        ? <a href={p.hoaUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline">{p.hoa}</a>
                        : p.hoa}
                    </span>
                  )}
                  {p.mudDistrict && (
                    <span>
                      <span className="text-slate-600">MUD: </span>
                      {p.mudUrl
                        ? <a href={p.mudUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline">{p.mudDistrict}</a>
                        : p.mudDistrict}
                    </span>
                  )}
                </div>
              )}
              {p.notes && <div className="text-xs text-slate-500 italic mb-3">{p.notes}</div>}

              {/* Mortgage balance */}
              <div className="border-t border-navy-700 pt-3 mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <Landmark size={11} className="text-slate-500" />
                  <span className="text-xs text-slate-500">Mortgage Balance</span>
                </div>
                {mortgageAcct ? (
                  <div className="bg-navy-900 rounded-lg p-2 text-xs">
                    <div className="text-slate-500 mb-1">{mortgageAcct.orgName} — {mortgageAcct.accountName}</div>
                    <div className="text-white font-semibold">{fmt(mortgageAcct.balance)}</div>
                    <div className="text-slate-600 mt-0.5">as of {mortgageAcct.fetchedAt}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 italic">No account linked — click Edit to link one</div>
                )}
              </div>

              {/* RentCast estimates */}
              <div className="border-t border-navy-700 pt-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp size={11} /> RentCast Estimates</span>
                  {canEdit && (
                    <button onClick={() => syncOne(p)} disabled={!!syncingId} className="text-xs text-slate-500 hover:text-emerald-400 disabled:opacity-40 flex items-center gap-1">
                      <RefreshCw size={10} className={isSyncingRc ? 'animate-spin' : ''} />
                      {rc?.fetchedAt || 'Fetch'}
                    </button>
                  )}
                </div>
                {rc && !rc.error ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-navy-900 rounded-lg p-2">
                      <div className="text-slate-500">Est. Value</div>
                      <div className="text-white font-semibold">{rc.estimatedValue ? fmt(rc.estimatedValue) : '—'}</div>
                      {fmtRange(rc.valueLow, rc.valueHigh) && <div className="text-slate-600 mt-0.5">{fmtRange(rc.valueLow, rc.valueHigh)}</div>}
                    </div>
                    <div className="bg-navy-900 rounded-lg p-2">
                      <div className="text-slate-500">Est. Rent</div>
                      <div className="text-emerald-400 font-semibold">{rc.estimatedRent ? fmt(rc.estimatedRent) + '/mo' : '—'}</div>
                      {fmtRange(rc.rentLow, rc.rentHigh) && <div className="text-slate-600 mt-0.5">{fmtRange(rc.rentLow, rc.rentHigh)}</div>}
                    </div>
                  </div>
                ) : isSyncingRc ? (
                  <div className="text-xs text-slate-500">Fetching…</div>
                ) : (
                  <div className="text-xs text-slate-600 italic">{rc?.error || 'No data — click Fetch or Sync RentCast'}</div>
                )}
              </div>

              {canEdit && (
                <div className="flex justify-end gap-2 pt-3 border-t border-navy-700">
                  <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><Pencil size={12} /> Edit</button>
                  <button onClick={() => remove(p.id)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400"><Trash2 size={12} /> Delete</button>
                </div>
              )}
            </div>
          );
        })}
        {properties.length === 0 && <div className="col-span-3 text-center py-16 text-slate-500"><Building2 size={40} className="mx-auto mb-3 opacity-30" /><div>No properties yet.</div></div>}
      </div>
    </div>
  );
}

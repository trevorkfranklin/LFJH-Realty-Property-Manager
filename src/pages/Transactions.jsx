import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Check, Ban, Split, Download } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleTransactions, sampleProperties, sampleOwners, TRANSACTION_CATEGORIES } from '../data/sampleData';
import { buildPatternMap, suggest, isUncategorized } from '../utils/categorizer';
import { sortByStreetName } from '../utils/sort';
import { usePropertyFilter } from '../context/PropertyFilter';
import { useAuth } from '../context/Auth';

const EMPTY = { id: '', date: new Date().toISOString().slice(0, 10), description: '', amount: '', type: 'Expense', category: '', propertyId: '', ownerId: '', notes: '', splits: [], rentPeriods: [], taxYear: null, taxType: '' };

function fmtPeriod(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function rentPeriodsLabel(periods) {
  if (!periods?.length) return null;
  if (periods.length === 1) return fmtPeriod(periods[0]);
  return `${fmtPeriod(periods[0])} – ${fmtPeriod(periods[periods.length - 1])} (${periods.length} mo)`;
}

const fmtAmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SplitModal({ title, form, setForm, onSave, onClose, properties, owners }) {
  const isSplit = form.splits && form.splits.length > 0;
  const totalPct = isSplit ? form.splits.reduce((s, sp) => s + (Number(sp.percentage) || 0), 0) : 0;
  const periods = form.rentPeriods || [];

  // 12 months centred on the transaction date (3 before … 8 after)
  const periodOptions = (() => {
    const base = form.date ? new Date(form.date + 'T00:00:00') : new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() - 3);
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const y = base.getFullYear();
      const m = String(base.getMonth() + 1).padStart(2, '0');
      opts.push(`${y}-${m}`);
      base.setMonth(base.getMonth() + 1);
    }
    return opts;
  })();

  const togglePeriod = (p) => {
    if (periods.includes(p)) {
      setForm({ ...form, rentPeriods: periods.filter(x => x !== p) });
    } else {
      setForm({ ...form, rentPeriods: [...periods, p].sort() });
    }
  };
  const removePeriod = (p) => setForm({ ...form, rentPeriods: periods.filter(x => x !== p) });

  const toggleSplit = () => {
    if (isSplit) {
      setForm({ ...form, splits: [] });
    } else {
      const count = properties.length;
      const base = Math.floor(100 / count);
      const rem = 100 - base * count;
      const splits = properties.map((p, i) => ({ propertyId: p.id, percentage: i === 0 ? base + rem : base }));
      setForm({ ...form, splits, propertyId: '' });
    }
  };

  const updatePct = (pid, val) =>
    setForm({ ...form, splits: form.splits.map(sp => sp.propertyId === pid ? { ...sp, percentage: Number(val) } : sp) });

  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option>Income</option><option>Expense</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400 block mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Rent payment" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Amount ($)</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
              <option value="">— No category —</option>
              {TRANSACTION_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Owner assignment */}
          {form.category === 'Owner Draw' && owners.length > 0 && (
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Owner</label>
              <select value={form.ownerId || ''} onChange={e => setForm({ ...form, ownerId: e.target.value })} className={inputCls}>
                <option value="">— Unassigned —</option>
                {owners.map(o => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
              </select>
            </div>
          )}

          {/* Rent periods */}
          {form.category === 'Rent' && (
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-2">Applies to period(s) — click to toggle</label>
              <div className="grid grid-cols-4 gap-1.5">
                {periodOptions.map(p => {
                  const active = periods.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePeriod(p)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors text-center ${
                        active
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                          : 'bg-navy-900 border-navy-700 text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {fmtPeriod(p)}
                    </button>
                  );
                })}
              </div>
              {periods.length === 0 && (
                <p className="text-xs text-slate-500 italic mt-2">No periods selected — defaults to {form.date ? fmtPeriod(form.date.slice(0, 7)) : 'transaction month'}</p>
              )}
            </div>
          )}

          {/* Tax year + type */}
          {form.category === 'Property Tax' && (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tax Year</label>
                <select
                  value={form.taxYear ?? ''}
                  onChange={e => setForm({ ...form, taxYear: e.target.value ? Number(e.target.value) : null })}
                  className={inputCls}
                >
                  <option value="">— Select year —</option>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tax Type</label>
                <select
                  value={form.taxType || ''}
                  onChange={e => setForm({ ...form, taxType: e.target.value })}
                  className={inputCls}
                >
                  <option value="">— Not specified —</option>
                  <option value="County">County</option>
                  <option value="MUD">MUD</option>
                </select>
              </div>
            </>
          )}

          {/* Property / Split */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400">Property</label>
              <button
                type="button"
                onClick={toggleSplit}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${isSplit ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-navy-600 text-slate-400 hover:text-white'}`}
              >
                <Split size={11} /> Split across properties
              </button>
            </div>
            {!isSplit ? (
              <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className={inputCls}>
                <option value="">— All / General —</option>
                {sortByStreetName(properties).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <div className="space-y-2">
                {form.splits.map(sp => {
                  const prop = properties.find(p => p.id === sp.propertyId);
                  const portion = form.amount ? Number(form.amount) * sp.percentage / 100 : null;
                  return (
                    <div key={sp.propertyId} className="flex items-center gap-2 bg-navy-900 border border-navy-700 rounded-lg px-3 py-2">
                      <span className="text-sm text-white flex-1 truncate">{prop?.name}</span>
                      <input
                        type="number" min="0" max="100" value={sp.percentage}
                        onChange={e => updatePct(sp.propertyId, e.target.value)}
                        className="w-14 bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white text-right"
                      />
                      <span className="text-xs text-slate-500">%</span>
                      {portion !== null && <span className="text-xs text-slate-400 w-20 text-right">{fmtAmt(portion)}</span>}
                    </div>
                  );
                })}
                <div className={`text-xs text-right font-medium ${totalPct === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Total: {totalPct}% {totalPct !== 100 && '— must equal 100%'}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2">
            <label className="text-xs text-slate-400 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={onSave}
            disabled={isSplit && totalPct !== 100}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useLocalStorage('lfjh_transactions', sampleTransactions);
  const [properties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [owners] = useLocalStorage('lfjh_owners', sampleOwners);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { filterProperty } = usePropertyFilter();
  const { canEdit } = useAuth();
  const [filterType, setFilterType] = useState('All');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDesc, setFilterDesc] = useState('');
  const [filterCategorized, setFilterCategorized] = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [showExcluded, setShowExcluded] = useState(false);

  const sfAccounts = useMemo(() => {
    const names = new Set();
    for (const tx of transactions) {
      if (tx.notes?.startsWith('SimpleFIN — ')) names.add(tx.notes.slice('SimpleFIN — '.length));
    }
    return [...names].sort();
  }, [transactions]);

  const propName = (id) => properties.find(p => p.id === id)?.name || '—';

  const splitDisplay = (tx) => {
    if (!tx.splits?.length) return null;
    if (tx.splits.every(sp => sp.percentage === tx.splits[0].percentage))
      return `Split equally (${tx.splits.length})`;
    return `Split (${tx.splits.length} props)`;
  };

  const filtered = useMemo(() =>
    [...transactions]
      .filter(tx => filterType === 'All' || tx.type === filterType)
      .filter(tx => !filterProperty ||
        tx.propertyId === filterProperty ||
        tx.splits?.some(sp => sp.propertyId === filterProperty))
      .filter(tx => !filterMonth || tx.date.startsWith(filterMonth))
      .filter(tx => !filterDesc || tx.description.toLowerCase().includes(filterDesc.toLowerCase()))
      .filter(tx => !filterCategory || tx.category === filterCategory)
      .filter(tx => !filterAccount || tx.notes === `SimpleFIN — ${filterAccount}`)
      .filter(tx => filterCategorized === 'all' || (filterCategorized === 'uncategorized') === isUncategorized(tx))
      .filter(tx => showExcluded || !tx.excluded)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactions, filterType, filterProperty, filterMonth, filterDesc, filterCategory, filterAccount, filterCategorized, showExcluded]
  );

  // Prorated amount for a specific property filter; 0 if split doesn't include it
  const effectiveAmount = (tx) => {
    if (filterProperty && tx.splits?.length) {
      const sp = tx.splits.find(s => s.propertyId === filterProperty);
      return sp ? Number(tx.amount) * sp.percentage / 100 : 0;
    }
    return Number(tx.amount);
  };

  // Totals ignore filterType / filterCategorized / filterDesc so Income + Expenses
  // always reflect the full picture for the selected property/month/category.
  const totals = useMemo(() => {
    const base = transactions
      .filter(t => !t.excluded)
      .filter(t => !filterProperty ||
        t.propertyId === filterProperty ||
        t.splits?.some(sp => sp.propertyId === filterProperty))
      .filter(t => !filterMonth || t.date.startsWith(filterMonth))
      .filter(t => !filterCategory || t.category === filterCategory);
    const income    = base.filter(t => t.type === 'Income').reduce((s, t) => s + effectiveAmount(t), 0);
    const expenses  = base.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw').reduce((s, t) => s + effectiveAmount(t), 0);
    const ownerDraw = base.filter(t => t.type === 'Expense' && t.category === 'Owner Draw').reduce((s, t) => s + effectiveAmount(t), 0);
    return { income, expenses, ownerDraw, net: income - expenses };
  }, [transactions, filterProperty, filterMonth, filterCategory]);

  const toggleExclude = (id) => setTransactions(prev => prev.map(t => t.id === id ? { ...t, excluded: !t.excluded } : t));

  const patternMap = useMemo(() => buildPatternMap(transactions), [transactions]);

  const applySuggestion = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const hit = suggest(tx.description, patternMap);
    if (!hit) return;
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, category: hit.category, propertyId: hit.propertyId || t.propertyId, categorized: true } : t
    ));
  };

  const openAdd = () => { setForm({ ...EMPTY, id: crypto.randomUUID() }); setModal('add'); };
  const openEdit = (tx) => { setForm({ ...tx, splits: tx.splits || [] }); setModal('edit'); };
  const save = () => {
    if (!form.description || !form.amount) return;
    const record = { ...form, amount: Number(form.amount), categorized: !!form.category };
    if (modal === 'add') setTransactions(prev => [...prev, record]);
    else setTransactions(prev => prev.map(t => t.id === record.id ? record : t));
    setModal(null);
  };
  const remove = (id) => { if (confirm('Delete this transaction?')) setTransactions(prev => prev.filter(t => t.id !== id)); };

  const exportCSV = () => {
    const esc = (v) => { const s = String(v ?? ''); return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const makeRow = (tx, property, amount) => [
      tx.date,
      tx.description,
      tx.type,
      tx.category,
      Number(amount).toFixed(2),
      property,
      tx.category === 'Property Tax' && tx.taxYear ? tx.taxYear : '',
      tx.category === 'Rent' && tx.rentPeriods?.length ? tx.rentPeriods.join('; ') : '',
      tx.notes || '',
    ].map(esc).join(',');

    const headers = ['Date','Description','Type','Category','Amount','Property','Tax Year','Rent Periods','Notes'];
    const lines = [];

    for (const tx of transactions.filter(tx => !isUncategorized(tx) && !tx.excluded)) {
      if (tx.splits?.length) {
        for (const sp of tx.splits) {
          lines.push(makeRow(tx, propName(sp.propertyId), Number(tx.amount) * sp.percentage / 100));
        }
      } else {
        lines.push(makeRow(tx, propName(tx.propertyId), tx.amount));
      }
    }

    const csv  = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `lfjh-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      {modal && (
        <SplitModal
          title={modal === 'add' ? 'Add Transaction' : 'Edit Transaction'}
          form={form} setForm={setForm} onSave={save} onClose={() => setModal(null)} properties={properties} owners={owners}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Transactions</h1><p className="text-slate-400 text-sm mt-1">Track all income and expenses</p></div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Download size={14} /> Export CSV
          </button>
          {canEdit && <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Transaction</button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mb-5">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Description</span>
          <input type="text" placeholder="Search…" value={filterDesc} onChange={e => setFilterDesc(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 w-52" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Type</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
            <option>All</option><option>Income</option><option>Expense</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Month</span>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Category</span>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">All Categories</option>
            {TRANSACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {sfAccounts.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Account</span>
            <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All Accounts</option>
              {sfAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Status</span>
          <select value={filterCategorized} onChange={e => setFilterCategorized(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="all">All</option>
            <option value="categorized">Categorized</option>
            <option value="uncategorized">Uncategorized</option>
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Excluded</span>
          <button onClick={() => setShowExcluded(v => !v)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${showExcluded ? 'bg-navy-800 border-navy-700 text-slate-400 hover:text-white' : 'bg-navy-700 border-navy-600 text-slate-300'}`}>
            <Ban size={13} /> {showExcluded ? 'Showing' : 'Hidden'}
          </button>
        </div>
      </div>
      <div className="flex gap-4 mb-5">
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-sm"><span className="text-slate-400">Income: </span><span className="text-emerald-400 font-semibold">{fmtAmt(totals.income)}</span></div>
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-sm"><span className="text-slate-400">Expenses: </span><span className="text-red-400 font-semibold">{fmtAmt(totals.expenses)}</span></div>
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-sm"><span className="text-slate-400">Owner Draw: </span><span className="text-purple-400 font-semibold">{fmtAmt(totals.ownerDraw)}</span></div>
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-sm"><span className="text-slate-400">Net: </span><span className={`font-semibold ${totals.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtAmt(totals.net)}</span></div>
      </div>
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Description</th>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">Property</th>
              <th className="text-right px-5 py-3">Amount</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {filtered.map(tx => {
              const hit = !tx.splits?.length && isUncategorized(tx) ? suggest(tx.description, patternMap) : null;
              const sd = splitDisplay(tx);
              return (
                <tr key={tx.id} className={`transition-colors ${tx.excluded ? 'opacity-40' : ''} ${!tx.excluded && isUncategorized(tx) ? 'bg-yellow-500/15 hover:bg-yellow-500/25' : 'hover:bg-navy-700/40'}`}>
                  <td className="px-5 py-3 text-slate-300">{tx.date}</td>
                  <td className="px-5 py-3 text-white">
                    <div>{tx.description}{tx.excluded && <span className="ml-2 text-xs text-slate-500 italic">excluded</span>}</div>
                    {tx.category === 'Rent' && tx.rentPeriods?.length > 0 && (
                      <div className="text-xs text-slate-500 mt-0.5">{rentPeriodsLabel(tx.rentPeriods)}</div>
                    )}
                    {tx.category === 'Property Tax' && tx.taxYear && (
                      <div className="text-xs text-slate-500 mt-0.5">Tax year {tx.taxYear}{tx.taxType ? ` — ${tx.taxType}` : ''}</div>
                    )}
                    {tx.category === 'Owner Draw' && (() => {
                      const o = owners.find(o => o.id === tx.ownerId);
                      return o
                        ? <div className="text-xs text-purple-400 mt-0.5">{o.firstName} {o.lastName}</div>
                        : <div className="text-xs text-yellow-500 mt-0.5 italic">Unassigned</div>;
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    {hit
                      ? <span className="text-amber-400 italic text-xs" title="Suggested — click ✓ to confirm">{hit.category}</span>
                      : <span className="text-slate-400">{tx.category || '—'}</span>}
                  </td>
                  <td className="px-5 py-3">
                    {sd
                      ? <span className="flex items-center gap-1 text-slate-400"><Split size={11} className="text-slate-500" />{sd}</span>
                      : hit?.propertyId && !tx.propertyId
                        ? <span className="text-amber-400 italic text-xs" title="Suggested — click ✓ to confirm">{propName(hit.propertyId)}</span>
                        : <span className="text-slate-400">{propName(tx.propertyId)}</span>}
                  </td>
                  <td className={`px-5 py-3 text-right font-semibold ${tx.excluded ? 'line-through text-slate-500' : tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'Income' ? '+' : '-'}{fmtAmt(tx.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && hit && <button onClick={() => applySuggestion(tx.id)} title="Confirm suggestion" className="text-amber-400 hover:text-emerald-400"><Check size={13} /></button>}
                      {canEdit && <button onClick={() => toggleExclude(tx.id)} title={tx.excluded ? 'Re-include' : 'Exclude'} className={`${tx.excluded ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-orange-400'}`}><Ban size={14} /></button>}
                      {canEdit && <button onClick={() => openEdit(tx)} className="text-slate-400 hover:text-white"><Pencil size={14} /></button>}
                      {canEdit && <button onClick={() => remove(tx.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No transactions found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

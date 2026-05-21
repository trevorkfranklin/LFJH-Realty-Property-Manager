import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleTransactions, sampleProperties, TRANSACTION_CATEGORIES } from '../data/sampleData';

const EMPTY = { id: '', date: new Date().toISOString().slice(0, 10), description: '', amount: '', type: 'Income', category: 'Rent', propertyId: '', notes: '' };

function Modal({ title, form, setForm, onSave, onClose, properties }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-400 block mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
              <option>Income</option><option>Expense</option>
            </select></div>
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Rent payment" className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Amount ($)</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
              {TRANSACTION_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Property</label>
            <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">— All / General —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none" /></div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Check size={14} /> Save</button>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useLocalStorage('lfjh_transactions', sampleTransactions);
  const [properties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterType, setFilterType] = useState('All');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = useMemo(() =>
    [...transactions]
      .filter(tx => filterType === 'All' || tx.type === filterType)
      .filter(tx => !filterProperty || tx.propertyId === filterProperty)
      .filter(tx => !filterMonth || tx.date.startsWith(filterMonth))
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactions, filterType, filterProperty, filterMonth]
  );

  const totals = useMemo(() => ({
    income: filtered.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0),
    expenses: filtered.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0),
  }), [filtered]);

  const openAdd = () => { setForm({ ...EMPTY, id: Date.now().toString() }); setModal('add'); };
  const openEdit = (tx) => { setForm({ ...tx }); setModal('edit'); };
  const save = () => {
    if (!form.description || !form.amount) return;
    if (modal === 'add') setTransactions([...transactions, { ...form, amount: Number(form.amount) }]);
    else setTransactions(transactions.map(t => t.id === form.id ? { ...form, amount: Number(form.amount) } : t));
    setModal(null);
  };
  const remove = (id) => { if (confirm('Delete this transaction?')) setTransactions(transactions.filter(t => t.id !== id)); };
  const propName = (id) => properties.find(p => p.id === id)?.name || '—';

  return (
    <div className="p-8">
      {modal && <Modal title={modal === 'add' ? 'Add Transaction' : 'Edit Transaction'} form={form} setForm={setForm} onSave={save} onClose={() => setModal(null)} properties={properties} />}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Transactions</h1><p className="text-slate-400 text-sm mt-1">Track all income and expenses</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Transaction</button>
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
          <option>All</option><option>Income</option><option>Expense</option>
        </select>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" />
      </div>
      <div className="flex gap-4 mb-5">
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-sm"><span className="text-slate-400">Income: </span><span className="text-emerald-400 font-semibold">{fmt(totals.income)}</span></div>
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-sm"><span className="text-slate-400">Expenses: </span><span className="text-red-400 font-semibold">{fmt(totals.expenses)}</span></div>
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-sm"><span className="text-slate-400">Net: </span><span className={`font-semibold ${totals.income - totals.expenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(totals.income - totals.expenses)}</span></div>
      </div>
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
            <th className="text-left px-5 py-3">Date</th><th className="text-left px-5 py-3">Description</th>
            <th className="text-left px-5 py-3">Category</th><th className="text-left px-5 py-3">Property</th>
            <th className="text-right px-5 py-3">Amount</th><th className="px-5 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-navy-700">
            {filtered.map(tx => (
              <tr key={tx.id} className="hover:bg-navy-700/40 transition-colors">
                <td className="px-5 py-3 text-slate-300">{tx.date}</td>
                <td className="px-5 py-3 text-white">{tx.description}</td>
                <td className="px-5 py-3 text-slate-400">{tx.category}</td>
                <td className="px-5 py-3 text-slate-400">{propName(tx.propertyId)}</td>
                <td className={`px-5 py-3 text-right font-semibold ${tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount)}</td>
                <td className="px-5 py-3"><div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(tx)} className="text-slate-400 hover:text-white"><Pencil size={14} /></button>
                  <button onClick={() => remove(tx.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No transactions found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { samplePropertyTaxes, sampleProperties } from '../data/sampleData';

const EMPTY = { id: '', propertyId: '', taxYear: new Date().getFullYear(), annualAmount: '', dueDate: '', paid: false, paidDate: '', notes: '' };

function Modal({ title, form, setForm, onSave, onClose, properties }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Property *</label>
            <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">— Select property —</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="text-xs text-slate-400 block mb-1">Tax Year *</label><input type="number" value={form.taxYear} onChange={e => setForm({ ...form, taxYear: Number(e.target.value) })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Annual Amount ($) *</label><input type="number" value={form.annualAmount} onChange={e => setForm({ ...form, annualAmount: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Status</label>
            <select value={form.paid ? 'Paid' : 'Unpaid'} onChange={e => setForm({ ...form, paid: e.target.value === 'Paid' })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white"><option>Unpaid</option><option>Paid</option></select></div>
          {form.paid && <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Date Paid</label><input type="date" value={form.paidDate || ''} onChange={e => setForm({ ...form, paidDate: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>}
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none" /></div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Check size={14} /> Save</button>
        </div>
      </div>
    </div>
  );
}

export default function PropertyTaxes() {
  const [taxes, setTaxes] = useLocalStorage('lfjh_property_taxes', samplePropertyTaxes);
  const [properties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterPaid, setFilterPaid] = useState('All');

  const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const propName = (id) => properties.find(p => p.id === id)?.name || '—';
  const filtered = taxes.filter(t => filterPaid === 'All' || (filterPaid === 'Paid' ? t.paid : !t.paid));
  const totalUnpaid = taxes.filter(t => !t.paid).reduce((s, t) => s + Number(t.annualAmount), 0);
  const totalPaid = taxes.filter(t => t.paid).reduce((s, t) => s + Number(t.annualAmount), 0);

  const openAdd = () => { setForm({ ...EMPTY, id: Date.now().toString() }); setModal('add'); };
  const openEdit = (t) => { setForm({ ...t }); setModal('edit'); };
  const save = () => {
    if (!form.propertyId || !form.annualAmount) return;
    const record = { ...form, annualAmount: Number(form.annualAmount) };
    if (modal === 'add') setTaxes([...taxes, record]);
    else setTaxes(taxes.map(t => t.id === form.id ? record : t));
    setModal(null);
  };
  const remove = (id) => { if (confirm('Delete this tax record?')) setTaxes(taxes.filter(t => t.id !== id)); };
  const togglePaid = (id) => setTaxes(taxes.map(t => t.id === id ? { ...t, paid: !t.paid, paidDate: !t.paid ? new Date().toISOString().slice(0, 10) : null } : t));

  return (
    <div className="p-8">
      {modal && <Modal title={modal === 'add' ? 'Add Tax Record' : 'Edit Tax Record'} form={form} setForm={setForm} onSave={save} onClose={() => setModal(null)} properties={properties} />}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Property Taxes</h1><p className="text-slate-400 text-sm mt-1">Track annual tax obligations across all properties</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Tax Record</button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-4"><div className="text-xs text-slate-400 mb-1">Total Records</div><div className="text-xl font-bold text-white">{taxes.length}</div></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-4"><div className="text-xs text-slate-400 mb-1">Unpaid</div><div className="text-xl font-bold text-yellow-400">{fmt(totalUnpaid)}</div></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-4"><div className="text-xs text-slate-400 mb-1">Paid</div><div className="text-xl font-bold text-emerald-400">{fmt(totalPaid)}</div></div>
      </div>
      <div className="flex gap-3 mb-5">
        {['All', 'Unpaid', 'Paid'].map(f => <button key={f} onClick={() => setFilterPaid(f)} className={`px-3 py-1.5 rounded-lg text-sm ${filterPaid === f ? 'bg-emerald-500 text-white' : 'bg-navy-800 text-slate-400 hover:text-white border border-navy-700'}`}>{f}</button>)}
      </div>
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-navy-700 text-slate-400 text-xs uppercase"><th className="text-left px-5 py-3">Property</th><th className="text-left px-5 py-3">Tax Year</th><th className="text-right px-5 py-3">Amount</th><th className="text-left px-5 py-3">Due Date</th><th className="text-left px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
          <tbody className="divide-y divide-navy-700">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-navy-700/40 transition-colors">
                <td className="px-5 py-3 text-white">{propName(t.propertyId)}</td>
                <td className="px-5 py-3 text-slate-300">{t.taxYear}</td>
                <td className="px-5 py-3 text-right font-semibold text-white">{fmt(t.annualAmount)}</td>
                <td className="px-5 py-3 text-slate-400">{t.dueDate || '—'}</td>
                <td className="px-5 py-3"><button onClick={() => togglePaid(t.id)} className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${t.paid ? 'bg-emerald-400/10 text-emerald-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{t.paid ? `Paid ${t.paidDate || ''}` : 'Unpaid'}</button></td>
                <td className="px-5 py-3"><div className="flex items-center justify-end gap-2"><button onClick={() => openEdit(t)} className="text-slate-400 hover:text-white"><Pencil size={14} /></button><button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={14} /></button></div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No tax records found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

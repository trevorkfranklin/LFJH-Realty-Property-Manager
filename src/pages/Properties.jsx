import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleProperties, PROPERTY_TYPES } from '../data/sampleData';

const EMPTY = { id: '', name: '', address: '', type: 'Single Family', purchasePrice: '', monthlyRent: '', bedrooms: '', bathrooms: '', sqft: '', status: 'Occupied', notes: '' };

function Modal({ title, form, setForm, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Property Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 123 Oak Street" className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Full Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Oak Street, City, ST 00000" className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Property Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label className="text-xs text-slate-400 block mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white"><option>Occupied</option><option>Vacant</option><option>Maintenance</option></select></div>
          <div><label className="text-xs text-slate-400 block mb-1">Purchase Price ($)</label><input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Monthly Rent ($)</label><input type="number" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Bedrooms</label><input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Bathrooms</label><input type="number" step="0.5" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Sq Ft</label><input type="number" value={form.sqft} onChange={e => setForm({ ...form, sqft: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
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

export default function Properties() {
  const [properties, setProperties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const fmt = (n) => n ? '$' + Number(n).toLocaleString() : '—';
  const openAdd = () => { setForm({ ...EMPTY, id: Date.now().toString() }); setModal('add'); };
  const openEdit = (p) => { setForm({ ...p }); setModal('edit'); };
  const save = () => {
    if (!form.name) return;
    const record = { ...form, purchasePrice: Number(form.purchasePrice), monthlyRent: Number(form.monthlyRent), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), sqft: Number(form.sqft) };
    if (modal === 'add') setProperties([...properties, record]);
    else setProperties(properties.map(p => p.id === form.id ? record : p));
    setModal(null);
  };
  const remove = (id) => { if (confirm('Delete this property?')) setProperties(properties.filter(p => p.id !== id)); };
  const statusColor = (s) => ({ Occupied: 'bg-emerald-400/10 text-emerald-400', Vacant: 'bg-yellow-400/10 text-yellow-400', Maintenance: 'bg-red-400/10 text-red-400' }[s] || 'bg-slate-400/10 text-slate-400');
  const totalMonthlyRent = properties.reduce((s, p) => s + (p.status === 'Occupied' ? Number(p.monthlyRent) : 0), 0);

  return (
    <div className="p-8">
      {modal && <Modal title={modal === 'add' ? 'Add Property' : 'Edit Property'} form={form} setForm={setForm} onSave={save} onClose={() => setModal(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Properties</h1><p className="text-slate-400 text-sm mt-1">{properties.length} properties · {fmt(totalMonthlyRent)}/mo gross rent</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Property</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {properties.map(p => (
          <div key={p.id} className="bg-navy-800 rounded-xl border border-navy-700 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-400/10 rounded-lg flex items-center justify-center flex-shrink-0"><Building2 size={18} className="text-emerald-400" /></div>
                <div><div className="font-semibold text-white text-sm">{p.name}</div><div className="text-xs text-slate-500">{p.type}</div></div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
            </div>
            <div className="text-xs text-slate-500 mb-3">{p.address}</div>
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Monthly Rent</div><div className="text-emerald-400 font-semibold">{fmt(p.monthlyRent)}</div></div>
              <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Purchase Price</div><div className="text-white font-semibold">{fmt(p.purchasePrice)}</div></div>
              <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Beds / Baths</div><div className="text-white">{p.bedrooms} bd / {p.bathrooms} ba</div></div>
              <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Sq Ft</div><div className="text-white">{p.sqft ? p.sqft.toLocaleString() : '—'}</div></div>
            </div>
            {p.notes && <div className="text-xs text-slate-500 italic mb-3">{p.notes}</div>}
            <div className="flex justify-end gap-2 pt-3 border-t border-navy-700">
              <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><Pencil size={12} /> Edit</button>
              <button onClick={() => remove(p.id)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400"><Trash2 size={12} /> Delete</button>
            </div>
          </div>
        ))}
        {properties.length === 0 && <div className="col-span-3 text-center py-16 text-slate-500"><Building2 size={40} className="mx-auto mb-3 opacity-30" /><div>No properties yet.</div></div>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleTenants, sampleProperties } from '../data/sampleData';

const EMPTY = { id: '', firstName: '', lastName: '', email: '', phone: '', propertyId: '', leaseStart: '', leaseEnd: '', monthlyRent: '', depositPaid: '', status: 'Active', notes: '' };

function Modal({ title, form, setForm, onSave, onClose, properties }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-400 block mb-1">First Name *</label><input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Last Name *</label><input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Property</label>
            <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">— Select property —</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="text-xs text-slate-400 block mb-1">Lease Start</label><input type="date" value={form.leaseStart} onChange={e => setForm({ ...form, leaseStart: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Lease End</label><input type="date" value={form.leaseEnd} onChange={e => setForm({ ...form, leaseEnd: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Monthly Rent ($)</label><input type="number" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Security Deposit ($)</label><input type="number" value={form.depositPaid} onChange={e => setForm({ ...form, depositPaid: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white"><option>Active</option><option>Past</option><option>Notice</option></select></div>
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

function initials(first, last) { return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase(); }

export default function Tenants() {
  const [tenants, setTenants] = useLocalStorage('lfjh_tenants', sampleTenants);
  const [properties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterStatus, setFilterStatus] = useState('All');

  const fmt = (n) => n ? '$' + Number(n).toLocaleString() : '—';
  const propName = (id) => properties.find(p => p.id === id)?.name || '—';
  const filtered = tenants.filter(t => filterStatus === 'All' || t.status === filterStatus);
  const statusColor = (s) => ({ Active: 'bg-emerald-400/10 text-emerald-400', Past: 'bg-slate-400/10 text-slate-400', Notice: 'bg-yellow-400/10 text-yellow-400' }[s] || 'bg-slate-400/10 text-slate-400');

  const openAdd = () => { setForm({ ...EMPTY, id: Date.now().toString() }); setModal('add'); };
  const openEdit = (t) => { setForm({ ...t }); setModal('edit'); };
  const save = () => {
    if (!form.firstName || !form.lastName) return;
    const record = { ...form, monthlyRent: Number(form.monthlyRent), depositPaid: Number(form.depositPaid) };
    if (modal === 'add') setTenants([...tenants, record]);
    else setTenants(tenants.map(t => t.id === form.id ? record : t));
    setModal(null);
  };
  const remove = (id) => { if (confirm('Delete this tenant?')) setTenants(tenants.filter(t => t.id !== id)); };
  const daysUntilLeaseEnd = (dateStr) => { if (!dateStr) return null; return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)); };

  return (
    <div className="p-8">
      {modal && <Modal title={modal === 'add' ? 'Add Tenant' : 'Edit Tenant'} form={form} setForm={setForm} onSave={save} onClose={() => setModal(null)} properties={properties} />}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Tenants</h1><p className="text-slate-400 text-sm mt-1">{tenants.filter(t => t.status === 'Active').length} active tenants</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Tenant</button>
      </div>
      <div className="flex gap-3 mb-5">
        {['All', 'Active', 'Notice', 'Past'].map(f => <button key={f} onClick={() => setFilterStatus(f)} className={`px-3 py-1.5 rounded-lg text-sm ${filterStatus === f ? 'bg-emerald-500 text-white' : 'bg-navy-800 text-slate-400 hover:text-white border border-navy-700'}`}>{f}</button>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(t => {
          const days = daysUntilLeaseEnd(t.leaseEnd);
          return (
            <div key={t.id} className="bg-navy-800 rounded-xl border border-navy-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-400/10 rounded-full flex items-center justify-center text-blue-400 text-sm font-bold flex-shrink-0">{initials(t.firstName, t.lastName)}</div>
                  <div><div className="font-semibold text-white">{t.firstName} {t.lastName}</div><div className="text-xs text-slate-500">{propName(t.propertyId)}</div></div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
              </div>
              <div className="space-y-1.5 text-xs mb-3">{t.email && <div className="text-slate-400">{t.email}</div>}{t.phone && <div className="text-slate-400">{t.phone}</div>}</div>
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Monthly Rent</div><div className="text-emerald-400 font-semibold">{fmt(t.monthlyRent)}</div></div>
                <div className="bg-navy-900 rounded-lg p-2"><div className="text-slate-500">Deposit</div><div className="text-white">{fmt(t.depositPaid)}</div></div>
                <div className="bg-navy-900 rounded-lg p-2 col-span-2">
                  <div className="text-slate-500">Lease Period</div>
                  <div className="text-white">{t.leaseStart || '—'} → {t.leaseEnd || '—'}</div>
                  {days !== null && days <= 60 && days >= 0 && <div className={`mt-0.5 font-medium ${days <= 30 ? 'text-red-400' : 'text-yellow-400'}`}>Expires in {days} days</div>}
                  {days !== null && days < 0 && <div className="mt-0.5 text-red-400 font-medium">Lease expired</div>}
                </div>
              </div>
              {t.notes && <div className="text-xs text-slate-500 italic mb-3">{t.notes}</div>}
              <div className="flex justify-end gap-2 pt-3 border-t border-navy-700">
                <button onClick={() => openEdit(t)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><Pencil size={12} /> Edit</button>
                <button onClick={() => remove(t.id)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-3 text-center py-16 text-slate-500"><Users size={40} className="mx-auto mb-3 opacity-30" /><div>No tenants found.</div></div>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAppData } from '../context/AppData';
import { useAuth } from '../context/Auth';

const EMPTY = { id: '', firstName: '', lastName: '', email: '', phone: '', ownershipPct: '', notes: '' };
const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Owners() {
  const { owners, addOwner, updateOwner, deleteOwner, transactions } = useAppData();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { canEdit } = useAuth();

  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';

  const ownerDraws = (ownerId) =>
    transactions.filter(t => !t.excluded && t.category === 'Owner Draw' && t.ownerId === ownerId);

  const unassignedDraws = transactions.filter(
    t => !t.excluded && t.category === 'Owner Draw' && !t.ownerId
  );

  const openAdd = () => { setForm({ ...EMPTY, id: crypto.randomUUID() }); setModal('add'); };
  const openEdit = (o) => { setForm(o); setModal('edit'); };
  const save = () => {
    if (!form.firstName || !form.lastName) return;
    if (modal === 'add') addOwner(form);
    else updateOwner(form);
    setModal(null);
  };
  const remove = (id) => {
    if (!confirm('Delete this owner?')) return;
    deleteOwner(id);
  };

  const totalPct = owners.reduce((s, o) => s + (Number(o.ownershipPct) || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
              <h2 className="font-semibold text-white">{modal === 'add' ? 'Add Owner' : 'Edit Owner'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">First Name</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Last Name</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Ownership %</label>
                <input type="number" min="0" max="100" step="0.01" value={form.ownershipPct} onChange={e => setForm({ ...form, ownershipPct: e.target.value })} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
              <button
                onClick={save}
                disabled={!form.firstName || !form.lastName}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Owners</h1>
          <p className="text-slate-400 text-sm mt-1">Manage ownership interests and track draws</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Owner
          </button>
        )}
      </div>

      {owners.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No owners added yet.</div>
      ) : (
        <>
          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden mb-4">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Contact</th>
                  <th className="text-right px-5 py-3">Ownership</th>
                  <th className="text-right px-5 py-3">Draws (YTD)</th>
                  <th className="text-right px-5 py-3">Total Draws</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {owners.map(o => {
                  const draws = ownerDraws(o.id);
                  const year = new Date().getFullYear();
                  const ytd  = draws.filter(t => t.date.startsWith(String(year))).reduce((s, t) => s + Number(t.amount), 0);
                  const total = draws.reduce((s, t) => s + Number(t.amount), 0);
                  return (
                    <tr key={o.id} className="hover:bg-navy-700/40 transition-colors">
                      <td className="px-5 py-3 text-white font-medium">{o.firstName} {o.lastName}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {o.email && <div>{o.email}</div>}
                        {o.phone && <div className="text-xs text-slate-500">{o.phone}</div>}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">{o.ownershipPct ? `${o.ownershipPct}%` : '—'}</td>
                      <td className="px-5 py-3 text-right text-purple-400 font-semibold">{fmt(ytd)}</td>
                      <td className="px-5 py-3 text-right text-purple-300">{fmt(total)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && <button onClick={() => openEdit(o)} className="text-slate-400 hover:text-white"><Pencil size={14} /></button>}
                          {canEdit && <button onClick={() => remove(o.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {owners.length > 1 && (
                <tfoot>
                  <tr className="border-t border-navy-600 text-xs text-slate-500">
                    <td colSpan={2} className="px-5 py-2">Total ownership</td>
                    <td className={`px-5 py-2 text-right font-medium ${Math.abs(totalPct - 100) < 0.01 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                      {totalPct}%
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
            </div>
          </div>

          {unassignedDraws.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-400 flex items-center gap-2">
              {unassignedDraws.length} Owner Draw transaction{unassignedDraws.length !== 1 ? 's are' : ' is'} not assigned to an owner — edit them on the Transactions page.
            </div>
          )}
        </>
      )}
    </div>
  );
}

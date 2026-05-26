import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users, UserPlus, Paperclip, ChevronDown, Download, Phone, Mail } from 'lucide-react';
import { useAppData } from '../context/AppData';
import { usePropertyFilter } from '../context/PropertyFilter';
import { useAuth } from '../context/Auth';
import { sortByStreetName, sortByLeaseEnd } from '../utils/sort';
import { DOC_CATEGORIES, DOC_CATEGORY_COLOR, listDocs, saveDoc, deleteDoc, openDoc } from '../hooks/useDocuments';

const EMPTY_CO  = () => ({ id: crypto.randomUUID(), firstName: '', lastName: '', email: '', phone: '' });

function fmtSize(n) {
  return n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}

function TenantDocuments({ tenantId }) {
  const [open, setOpen]         = useState(false);
  const [docs, setDocs]         = useState([]);
  const [category, setCategory] = useState('Lease');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const reload = useCallback(async () => {
    setDocs(await listDocs(tenantId));
  }, [tenantId]);

  useEffect(() => { if (open) reload(); }, [open, reload]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    await saveDoc(tenantId, file, category);
    await reload();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await deleteDoc(doc.id);
    await reload();
  };

  return (
    <div className="border-t border-navy-700 pt-3 mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white w-full"
      >
        <Paperclip size={12} />
        <span>Documents</span>
        {docs.length > 0 && (
          <span className="bg-navy-700 text-slate-300 rounded-full px-1.5 py-0.5 text-xs">{docs.length}</span>
        )}
        <ChevronDown size={12} className={`ml-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* Upload row */}
          <div className="flex gap-2">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="flex-1 bg-navy-900 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-white"
            >
              {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 hover:text-white rounded-lg disabled:opacity-40"
            >
              <Plus size={10} /> {uploading ? 'Saving…' : 'Add'}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>

          {/* Document list */}
          {docs.length === 0 && (
            <p className="text-xs text-slate-600 italic py-1">No documents yet — select a type and click Add</p>
          )}
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 bg-navy-900 rounded-lg px-2.5 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{doc.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs ${DOC_CATEGORY_COLOR[doc.category] || 'text-slate-500'}`}>{doc.category}</span>
                  <span className="text-slate-600 text-xs">· {fmtSize(doc.size)}</span>
                  <span className="text-slate-700 text-xs">· {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => openDoc(doc.id, doc.mimeType, doc.name)}
                title="Open / Download"
                className="text-slate-500 hover:text-emerald-400 flex-shrink-0"
              >
                <Download size={12} />
              </button>
              <button
                onClick={() => handleDelete(doc)}
                title="Delete"
                className="text-slate-500 hover:text-red-400 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const EMPTY     = { id: '', firstName: '', lastName: '', email: '', phone: '', coTenants: [], propertyId: '', leaseStart: '', leaseEnd: '', monthlyRent: '', depositPaid: '', petDeposit: '', status: 'Active', notes: '' };

function CoTenantRow({ ct, index, onChange, onRemove }) {
  const upd = (field, val) => onChange(index, { ...ct, [field]: val });
  const cls = 'w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-white';
  return (
    <div className="bg-navy-900 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Occupant {index + 2}</span>
        <button onClick={onRemove} className="text-slate-500 hover:text-red-400"><X size={12} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="First name" value={ct.firstName} onChange={e => upd('firstName', e.target.value)} className={cls} />
        <input placeholder="Last name"  value={ct.lastName}  onChange={e => upd('lastName',  e.target.value)} className={cls} />
        <input placeholder="Email"      value={ct.email}     onChange={e => upd('email',     e.target.value)} className={cls} />
        <input placeholder="Phone"      value={ct.phone}     onChange={e => upd('phone',     e.target.value)} className={cls} />
      </div>
    </div>
  );
}

function Modal({ title, form, setForm, onSave, onClose, properties }) {
  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white';
  const coTenants = form.coTenants || [];

  const updateCoTenant = (i, updated) =>
    setForm({ ...form, coTenants: coTenants.map((c, j) => j === i ? updated : c) });
  const removeCoTenant = (i) =>
    setForm({ ...form, coTenants: coTenants.filter((_, j) => j !== i) });
  const addCoTenant = () =>
    setForm({ ...form, coTenants: [...coTenants, EMPTY_CO()] });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">

          {/* Primary tenant */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Primary Tenant</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 block mb-1">First Name *</label><input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Last Name *</label><input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} /></div>
            </div>
          </div>

          {/* Co-tenants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Additional Occupants</div>
              <button onClick={addCoTenant} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <UserPlus size={12} /> Add Occupant
              </button>
            </div>
            {coTenants.length === 0 && <p className="text-xs text-slate-600 italic">None — click Add Occupant to include co-tenants</p>}
            <div className="space-y-2">
              {coTenants.map((ct, i) => (
                <CoTenantRow key={ct.id} ct={ct} index={i} onChange={updateCoTenant} onRemove={() => removeCoTenant(i)} />
              ))}
            </div>
          </div>

          {/* Property & lease */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Lease</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Property</label>
                <select value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })} className={inputCls}>
                  <option value="">— Select property —</option>
                  {sortByStreetName(properties).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">Lease Start</label><input type="date" value={form.leaseStart} onChange={e => setForm({ ...form, leaseStart: e.target.value })} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Lease End</label><input type="date" value={form.leaseEnd} onChange={e => setForm({ ...form, leaseEnd: e.target.value })} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Monthly Rent ($)</label><input type="number" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  <option>Active</option><option>Past</option><option>Notice</option>
                </select>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">Security Deposit ($)</label><input type="number" value={form.depositPaid} onChange={e => setForm({ ...form, depositPaid: e.target.value })} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400 block mb-1">Pet Deposit ($)</label><input type="number" value={form.petDeposit} onChange={e => setForm({ ...form, petDeposit: e.target.value })} className={inputCls} /></div>
              <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
            </div>
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

function initials(first, last) { return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase(); }

export default function Tenants() {
  const { tenants, addTenant, updateTenant, deleteTenant, properties } = useAppData();
  const { filterProperty }      = usePropertyFilter();
  const { canEdit } = useAuth();
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [filterStatus, setFilterStatus] = useState('All');

  const fmt      = (n) => n ? '$' + Number(n).toLocaleString() : '—';
  const propName = (id) => properties.find(p => p.id === id)?.name || '—';
  const statusColor = (s) => ({ Active: 'bg-emerald-400/10 text-emerald-400', Past: 'bg-slate-400/10 text-slate-400', Notice: 'bg-yellow-400/10 text-yellow-400' }[s] || 'bg-slate-400/10 text-slate-400');

  const filtered = sortByLeaseEnd(
    tenants
      .filter(t => !filterProperty || t.propertyId === filterProperty)
      .filter(t => filterStatus === 'All' || t.status === filterStatus)
  );

  const openAdd  = () => { setForm({ ...EMPTY, id: crypto.randomUUID(), coTenants: [] }); setModal('add'); };
  const openEdit = (t) => { setForm({ ...t, coTenants: t.coTenants || [], petDeposit: t.petDeposit || '' }); setModal('edit'); };
  const save = () => {
    if (!form.firstName || !form.lastName) return;
    const record = { ...form, monthlyRent: Number(form.monthlyRent), depositPaid: Number(form.depositPaid), petDeposit: Number(form.petDeposit) || 0 };
    if (modal === 'add') addTenant(record);
    else updateTenant(record);
    setModal(null);
  };
  const remove = (id) => { if (confirm('Delete this tenant record?')) deleteTenant(id); };
  const daysUntilLeaseEnd = (dateStr) => { if (!dateStr) return null; return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)); };

  return (
    <div className="p-4 md:p-8">
      {modal && <Modal title={modal === 'add' ? 'Add Tenant' : 'Edit Tenant'} form={form} setForm={setForm} onSave={save} onClose={() => setModal(null)} properties={properties} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="text-slate-400 text-sm mt-1">{tenants.filter(t => t.status === 'Active').length} active leases</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Tenant</button>
        )}
      </div>
      <div className="flex gap-3 mb-5">
        {['All', 'Active', 'Notice', 'Past'].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)} className={`px-3 py-1.5 rounded-lg text-sm ${filterStatus === f ? 'bg-emerald-500 text-white' : 'bg-navy-800 text-slate-400 hover:text-white border border-navy-700'}`}>{f}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(t => {
          const days      = daysUntilLeaseEnd(t.leaseEnd);
          const coTenants = t.coTenants || [];
          return (
            <div key={t.id} className="bg-navy-800 rounded-xl border border-navy-700 flex flex-col">

              {/* ── Header ─────────────────────────────────────── */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-400/10 rounded-full flex items-center justify-center text-blue-400 text-sm font-bold flex-shrink-0">
                      {initials(t.firstName, t.lastName)}
                    </div>
                    <div>
                      <div className="font-semibold text-white leading-tight">{t.firstName} {t.lastName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{propName(t.propertyId)}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${statusColor(t.status)}`}>{t.status}</span>
                </div>

                {/* Primary contact */}
                <div className="space-y-1.5">
                  {t.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone size={11} className="text-slate-600 flex-shrink-0" />{t.phone}
                    </div>
                  )}
                  {t.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail size={11} className="text-slate-600 flex-shrink-0" />{t.email}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Co-tenants ─────────────────────────────────── */}
              {coTenants.length > 0 && (
                <div className="border-t border-navy-700 px-5 py-3 space-y-2.5">
                  {coTenants.map((ct, i) => (
                    <div key={ct.id || i} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 text-xs font-medium flex-shrink-0">
                        {initials(ct.firstName, ct.lastName)}
                      </div>
                      <div className="text-xs min-w-0">
                        <div className="text-slate-300 font-medium">{ct.firstName} {ct.lastName}</div>
                        {ct.phone && <div className="text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{ct.phone}</div>}
                        {ct.email && <div className="text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={10} />{ct.email}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Financial details (key-value list) ─────────── */}
              <div className="border-t border-navy-700 divide-y divide-navy-700 text-xs flex-1">
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-slate-500">Monthly Rent</span>
                  <span className="text-emerald-400 font-semibold">{fmt(t.monthlyRent)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-slate-500">Security Deposit</span>
                  <span className="text-white">{fmt(t.depositPaid)}</span>
                </div>
                {Number(t.petDeposit) > 0 && (
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-slate-500">Pet Deposit</span>
                    <span className="text-white">{fmt(t.petDeposit)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-slate-500">Lease End</span>
                  <div className="text-right">
                    <div className="text-white">{t.leaseEnd || '—'}</div>
                    {days !== null && days <= 60 && days >= 0 && (
                      <div className={`font-medium ${days <= 30 ? 'text-red-400' : 'text-yellow-400'}`}>Expires in {days}d</div>
                    )}
                    {days !== null && days < 0 && <div className="text-red-400 font-medium">Expired</div>}
                  </div>
                </div>
                {t.notes && (
                  <div className="px-5 py-2.5 text-slate-500 italic">{t.notes}</div>
                )}
              </div>

              {/* ── Documents ──────────────────────────────────── */}
              <div className="px-5 border-t border-navy-700">
                <TenantDocuments tenantId={t.id} />
              </div>

              {/* ── Actions ────────────────────────────────────── */}
              {canEdit && (
                <div className="flex justify-end gap-3 px-5 py-3 border-t border-navy-700">
                  <button onClick={() => openEdit(t)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><Pencil size={12} /> Edit</button>
                  <button onClick={() => remove(t.id)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400"><Trash2 size={12} /> Delete</button>
                </div>
              )}

            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <div>No tenants found.</div>
          </div>
        )}
      </div>
    </div>
  );
}

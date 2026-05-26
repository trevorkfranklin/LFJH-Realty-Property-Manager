import { useState } from 'react';
import { Plus, Trash2, Key, Shield, Eye, X, Check } from 'lucide-react';
import { useAuth } from '../context/Auth';

function AddUserModal({ onClose }) {
  const { createUser } = useAuth();
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]     = useState('viewer');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white';

  const save = async () => {
    if (!email || !password) return;
    setLoading(true);
    const r = await createUser(email, password, role);
    if (r.error) { setError(r.error); setLoading(false); }
    else onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">Add User</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div><label className="text-xs text-slate-400 block mb-1">Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} autoFocus /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Password *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
              <option value="admin">Admin — full access</option>
              <option value="viewer">Viewer — read only</option>
            </select>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-slate-500">The new user will receive a confirmation email if email confirmation is enabled in Supabase.</p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={loading || !email || !password} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Check size={14} /> Add User
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const { session } = useAuth();
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!pwd) return;
    setLoading(true);
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (!error) setDone(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">Change My Password</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4">
          {done ? (
            <p className="text-emerald-400 text-sm">Password updated successfully.</p>
          ) : (
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New password" autoFocus
              className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" />
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">{done ? 'Close' : 'Cancel'}</button>
          {!done && (
            <button onClick={save} disabled={loading || !pwd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              <Check size={14} /> Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const { session, profile, profiles, updateRole, deleteUser, isAdmin } = useAuth();
  const [showAdd, setShowAdd]       = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  if (!isAdmin) return (
    <div className="p-8 text-center text-slate-500 pt-24">
      <Shield size={40} className="mx-auto mb-3 opacity-30" />
      <div>Admin access required</div>
    </div>
  );

  const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';
  const roleBadge = (role) => role === 'admin'
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Admin</span>
    : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-400/10 text-slate-400">Viewer</span>;

  return (
    <div className="p-4 md:p-8">
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users & Access</h1>
          <p className="text-slate-400 text-sm mt-1">Manage accounts and roles</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowChangePwd(true)} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium">
            <Key size={14} /> Change My Password
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Created</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {profiles.map(u => (
              <tr key={u.id} className="hover:bg-navy-700/40">
                <td className="px-5 py-3 text-white font-medium">
                  {u.email}
                  {u.id === session?.user?.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                </td>
                <td className="px-5 py-3">{roleBadge(u.role)}</td>
                <td className="px-5 py-3 text-slate-400">{fmt(u.created_at)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => updateRole(u.id, u.role === 'admin' ? 'viewer' : 'admin')}
                      title="Toggle role" className="text-slate-400 hover:text-emerald-400">
                      {u.role === 'admin' ? <Eye size={14} /> : <Shield size={14} />}
                    </button>
                    {u.id !== session?.user?.id && (
                      <button onClick={() => { if (confirm(`Remove "${u.email}" from the app?`)) deleteUser(u.id); }}
                        title="Remove user" className="text-slate-400 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No users found</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Trash2, Key, Shield, Eye, X, Check } from 'lucide-react';
import { useAuth } from '../context/Auth';

const ACTION_LABELS = {
  login: 'Signed in',
  login_failed: 'Failed sign-in',
  logout: 'Signed out',
  create_user: 'Created user',
  update_role: 'Changed role',
  change_password: 'Changed password',
  delete_user: 'Deleted user',
};

function AddUserModal({ onClose }) {
  const { createUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('viewer');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white';

  const save = async () => {
    if (!username || !password) return;
    setLoading(true);
    const r = await createUser(username, password, role, username);
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
          <div><label className="text-xs text-slate-400 block mb-1">Email *</label><input type="email" value={username} onChange={e => setUsername(e.target.value)} className={inputCls} autoFocus /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Password *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
              <option value="admin">Admin — full access</option>
              <option value="viewer">Viewer — read only</option>
            </select>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={loading || !username || !password} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Check size={14} /> Add User
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEmailModal({ user, onClose }) {
  const { updateEmail } = useAuth();
  const [email, setEmail] = useState(user.email || '');

  const save = () => { updateEmail(user.id, email); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">Edit Email — {user.username}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" autoFocus
            className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose }) {
  const { changePassword } = useAuth();
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!pwd) return;
    setLoading(true);
    await changePassword(user.id, pwd);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">Change Password — {user.username}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4">
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New password" autoFocus
            className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={loading || !pwd} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const { users, auditLog, session, updateRole, deleteUser, isAdmin } = useAuth();
  const [showAdd, setShowAdd]             = useState(false);
  const [changePwdUser, setChangePwdUser] = useState(null);
  const [tab, setTab]                     = useState('users');

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
    <div className="p-8">
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {changePwdUser && <ChangePasswordModal user={changePwdUser} onClose={() => setChangePwdUser(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users & Access</h1>
          <p className="text-slate-400 text-sm mt-1">Manage accounts and review activity</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {['users', 'audit'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === t ? 'bg-emerald-500 text-white' : 'bg-navy-800 text-slate-400 hover:text-white border border-navy-700'}`}>
            {t === 'users' ? 'Users' : 'Audit Log'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Created</th>
                <th className="text-left px-5 py-3">Last Sign-in</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-navy-700/40">
                  <td className="px-5 py-3 text-white font-medium">{u.username}{u.id === session?.userId && <span className="ml-2 text-xs text-slate-500">(you)</span>}</td>
                  <td className="px-5 py-3">{roleBadge(u.role)}</td>
                  <td className="px-5 py-3 text-slate-400">{fmt(u.createdAt)}</td>
                  <td className="px-5 py-3 text-slate-400">{fmt(u.lastLogin)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => updateRole(u.id, u.role === 'admin' ? 'viewer' : 'admin')}
                        title="Toggle role" className="text-slate-400 hover:text-emerald-400">
                        {u.role === 'admin' ? <Eye size={14} /> : <Shield size={14} />}
                      </button>
                      <button onClick={() => setChangePwdUser(u)} title="Change password" className="text-slate-400 hover:text-yellow-400">
                        <Key size={14} />
                      </button>
                      {u.id !== session?.userId && (
                        <button onClick={() => { if (confirm(`Delete "${u.username}"?`)) deleteUser(u.id); }}
                          title="Delete user" className="text-slate-400 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
                <th className="text-left px-5 py-3">Time</th>
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {auditLog.slice(0, 200).map(e => (
                <tr key={e.id} className="hover:bg-navy-700/40">
                  <td className="px-5 py-2.5 text-slate-400 text-xs whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-white">{e.username}</td>
                  <td className="px-5 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.action === 'login' ? 'bg-emerald-400/10 text-emerald-400' : e.action === 'login_failed' ? 'bg-red-400/10 text-red-400' : e.action === 'logout' ? 'bg-slate-400/10 text-slate-400' : 'bg-blue-400/10 text-blue-400'}`}>
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 text-xs">{e.details || '—'}</td>
                </tr>
              ))}
              {auditLog.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No activity yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

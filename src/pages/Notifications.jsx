import { useState, useMemo, useEffect } from 'react';
import { Bell, Send, X, Plus, Check, Edit2, ToggleLeft, ToggleRight, Clock, AlertTriangle, Loader } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAppData } from '../context/AppData';
import { useAuth } from '../context/Auth';
import { sortByStreetName } from '../utils/sort';

const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_RULES = [
  { id: 'lease_60', type: 'lease_expiry',  name: 'Lease expiring — 60 days',  active: true,  days: 60, recipientType: 'tenant', subject: 'Lease Renewal Notice — {{propertyName}}', body: 'Dear {{tenantName}},\n\nThis is a friendly reminder that your lease at {{propertyName}} is scheduled to expire on {{leaseEndDate}} ({{daysUntilExpiry}} days from today).\n\nPlease contact us to discuss renewal options.\n\nThank you,\nLFJH (aka LT²D) Realty, LLC' },
  { id: 'lease_30', type: 'lease_expiry',  name: 'Lease expiring — 30 days',  active: true,  days: 30, recipientType: 'tenant', subject: 'Urgent: Lease Ending Soon — {{propertyName}}', body: 'Dear {{tenantName}},\n\nYour lease at {{propertyName}} expires in just {{daysUntilExpiry}} days on {{leaseEndDate}}.\n\nPlease contact us immediately to discuss renewal or move-out arrangements.\n\nThank you,\nLFJH (aka LT²D) Realty, LLC' },
  { id: 'rent_5',   type: 'rent_reminder', name: 'Rent reminder — 5 days',    active: true,  days: 5,  recipientType: 'tenant', subject: 'Rent Reminder — {{propertyName}}', body: 'Dear {{tenantName}},\n\nThis is a reminder that your monthly rent of {{rentAmount}} for {{propertyName}} is due in {{daysUntilDue}} days.\n\nPlease ensure payment is submitted on time.\n\nThank you,\nLFJH (aka LT²D) Realty, LLC' },
  { id: 'tax_14',   type: 'tax_due',       name: 'Property tax due — 14 days', active: true, days: 14, recipientType: 'admin',   subject: 'Property Tax Due — {{propertyName}} ({{taxYear}})', body: 'Reminder: Property tax ({{taxType}}) for {{propertyName}} — Tax Year {{taxYear}} — is due on {{dueDate}}.\n\nBalance: {{balance}}' },
  { id: 'hoa_14',   type: 'hoa_due',       name: 'HOA dues due — 14 days',    active: true,  days: 14, recipientType: 'admin',   subject: 'HOA Dues Due — {{propertyName}} ({{year}})', body: 'Reminder: HOA dues for {{propertyName}} — {{year}} — are due on {{dueDate}}.\n\nBalance: {{balance}}' },
];

function fill(template, vars) {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), template);
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function fmtMoney(n) { return n ? '$' + Number(n).toLocaleString() : '—'; }
function daysUntil(d) { return Math.ceil((new Date(d) - new Date(TODAY)) / 86400000); }

export function useNotificationCount() {
  const [rules]      = useLocalStorage('lfjh_notif_rules', DEFAULT_RULES);
  const [history]    = useLocalStorage('lfjh_notif_history', []);
  const { tenants, properties, propertyTaxes: taxes, hoaDues: hoa } = useAppData();

  return useMemo(() => {
    const sent = new Set(history.filter(h => h.status !== 'pending').map(h => h.key));
    let count = 0;
    const propName = (id) => properties.find(p => p.id === id)?.name || '';

    for (const rule of rules.filter(r => r.active)) {
      if (rule.type === 'lease_expiry') {
        for (const t of tenants.filter(t => t.status === 'Active' && t.leaseEnd)) {
          const d = daysUntil(t.leaseEnd);
          if (d >= 0 && d <= rule.days) {
            const key = `${rule.id}_${t.id}_${t.leaseEnd}`;
            if (!sent.has(key)) count++;
          }
        }
      } else if (rule.type === 'rent_reminder') {
        for (const t of tenants.filter(t => t.status === 'Active')) {
          const dueDay = 1;
          const now = new Date();
          const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
          if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
          const d = daysUntil(dueDate.toISOString().slice(0, 10));
          if (d >= 0 && d <= rule.days) {
            const key = `${rule.id}_${t.id}_${dueDate.toISOString().slice(0, 7)}`;
            if (!sent.has(key)) count++;
          }
        }
      } else if (rule.type === 'tax_due') {
        for (const r of taxes.filter(r => r.dueDate && r.dueDate >= TODAY && r.annualAmount)) {
          const d = daysUntil(r.dueDate);
          if (d >= 0 && d <= rule.days) {
            const key = `${rule.id}_${r.id}`;
            if (!sent.has(key)) count++;
          }
        }
      } else if (rule.type === 'hoa_due') {
        for (const r of hoa.filter(r => r.dueDate && r.dueDate >= TODAY && r.annualAmount)) {
          const d = daysUntil(r.dueDate);
          if (d >= 0 && d <= rule.days) {
            const key = `${rule.id}_${r.id}`;
            if (!sent.has(key)) count++;
          }
        }
      }
    }
    return count;
  }, [rules, history, tenants, properties, taxes, hoa]);
}

function RuleModal({ rule, onSave, onClose }) {
  const [form, setForm] = useState(rule || { id: crypto.randomUUID(), type: 'custom', name: '', active: true, days: 14, recipientType: 'tenant', subject: '', body: '' });
  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white';
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl border border-navy-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-semibold text-white">{rule ? 'Edit Rule' : 'New Rule'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div><label className="text-xs text-slate-400 block mb-1">Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls}>
                <option value="lease_expiry">Lease expiry</option>
                <option value="rent_reminder">Rent reminder</option>
                <option value="tax_due">Property tax due</option>
                <option value="hoa_due">HOA dues due</option>
                <option value="custom">Custom / manual</option>
              </select>
            </div>
            <div><label className="text-xs text-slate-400 block mb-1">Recipient</label>
              <select value={form.recipientType} onChange={e => setForm({...form, recipientType: e.target.value})} className={inputCls}>
                <option value="tenant">Tenants</option>
                <option value="admin">Admins</option>
                <option value="viewer">Viewers</option>
              </select>
            </div>
          </div>
          {form.type !== 'custom' && (
            <div><label className="text-xs text-slate-400 block mb-1">Trigger days before event</label>
              <input type="number" value={form.days} onChange={e => setForm({...form, days: Number(e.target.value)})} className={inputCls} />
            </div>
          )}
          <div><label className="text-xs text-slate-400 block mb-1">Subject</label><input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className={inputCls} /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Body</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={6} className={`${inputCls} resize-none font-mono text-xs`} />
            <p className="text-xs text-slate-600 mt-1">Variables: {'{{tenantName}}'} {'{{propertyName}}'} {'{{leaseEndDate}}'} {'{{daysUntilExpiry}}'} {'{{rentAmount}}'} {'{{dueDate}}'} {'{{balance}}'} {'{{year}}'} {'{{taxType}}'} {'{{taxYear}}'}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Check size={14} /> Save</button>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { profiles: users, canEdit } = useAuth();
  const [rules, setRules]     = useLocalStorage('lfjh_notif_rules', DEFAULT_RULES);
  const [history, setHistory] = useLocalStorage('lfjh_notif_history', []);
  const { tenants, properties, propertyTaxes: taxes, hoaDues: hoa } = useAppData();
  const [tab, setTab]           = useState('queue');
  const [editRule, setEditRule] = useState(null);
  const [showNewRule, setShowNewRule] = useState(false);
  const [customRecipient, setCustomRecipient] = useState('');
  const [customSubject, setCustomSubject]     = useState('');
  const [customBody, setCustomBody]           = useState('');
  const [gmailConnected, setGmailConnected]   = useState(false);
  const [sending, setSending]                 = useState(null); // key of item being sent

  useEffect(() => {
    fetch('/api/gmail/status')
      .then(r => r.json())
      .then(d => setGmailConnected(d.connected))
      .catch(() => {});
  }, []);

  const propName = (id) => properties.find(p => p.id === id)?.name || '—';
  const sent     = useMemo(() => new Set(history.filter(h => h.status !== 'pending').map(h => h.key)), [history]);

  // Auto-generate pending notifications from active rules + live data
  const queue = useMemo(() => {
    const items = [];

    for (const rule of rules.filter(r => r.active && r.type !== 'custom')) {
      if (rule.type === 'lease_expiry') {
        for (const t of tenants.filter(t => t.status === 'Active' && t.leaseEnd)) {
          const d = daysUntil(t.leaseEnd);
          if (d < 0 || d > rule.days) continue;
          const key = `${rule.id}_${t.id}_${t.leaseEnd}`;
          if (sent.has(key)) continue;
          const pName = propName(t.propertyId);
          const vars = { tenantName: `${t.firstName} ${t.lastName}`, propertyName: pName, leaseEndDate: fmtDate(t.leaseEnd), daysUntilExpiry: d };
          items.push({ key, ruleId: rule.id, type: rule.type, ruleName: rule.name, recipientEmail: t.email, recipientName: `${t.firstName} ${t.lastName}`, propertyName: pName, subject: fill(rule.subject, vars), body: fill(rule.body, vars), daysUntil: d, urgent: d <= 14 });
        }
      } else if (rule.type === 'rent_reminder') {
        for (const t of tenants.filter(t => t.status === 'Active' && t.email)) {
          const now = new Date();
          const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);
          if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
          const dueDateStr = dueDate.toISOString().slice(0, 10);
          const d = daysUntil(dueDateStr);
          if (d < 0 || d > rule.days) continue;
          const key = `${rule.id}_${t.id}_${dueDate.toISOString().slice(0, 7)}`;
          if (sent.has(key)) continue;
          const pName = propName(t.propertyId);
          const vars = { tenantName: `${t.firstName} ${t.lastName}`, propertyName: pName, rentAmount: fmtMoney(t.monthlyRent), daysUntilDue: d, dueDate: fmtDate(dueDateStr) };
          items.push({ key, ruleId: rule.id, type: rule.type, ruleName: rule.name, recipientEmail: t.email, recipientName: `${t.firstName} ${t.lastName}`, propertyName: pName, subject: fill(rule.subject, vars), body: fill(rule.body, vars), daysUntil: d, urgent: d <= 3 });
        }
      } else if (rule.type === 'tax_due') {
        for (const r of taxes.filter(r => r.dueDate && r.dueDate >= TODAY && r.annualAmount)) {
          const d = daysUntil(r.dueDate);
          if (d < 0 || d > rule.days) continue;
          const key = `${rule.id}_${r.id}`;
          if (sent.has(key)) continue;
          const pName = propName(r.propertyId);
          const userEmails = users.filter(u => rule.recipientType === 'viewer' ? u.role === 'viewer' : u.role === 'admin').map(u => u.email).join(', ');
          const recipientName = rule.recipientType === 'viewer' ? 'Viewers' : 'Admins';
          const vars = { propertyName: pName, taxYear: r.taxYear, taxType: r.taxType || '', dueDate: fmtDate(r.dueDate), balance: fmtMoney(r.annualAmount), year: r.taxYear };
          items.push({ key, ruleId: rule.id, type: rule.type, ruleName: rule.name, recipientEmail: userEmails, recipientName, propertyName: pName, subject: fill(rule.subject, vars), body: fill(rule.body, vars), daysUntil: d, urgent: d <= 7 });
        }
      } else if (rule.type === 'hoa_due') {
        for (const r of hoa.filter(r => r.dueDate && r.dueDate >= TODAY && r.annualAmount)) {
          const d = daysUntil(r.dueDate);
          if (d < 0 || d > rule.days) continue;
          const key = `${rule.id}_${r.id}`;
          if (sent.has(key)) continue;
          const pName = propName(r.propertyId);
          const userEmails = users.filter(u => rule.recipientType === 'viewer' ? u.role === 'viewer' : u.role === 'admin').map(u => u.email).join(', ');
          const recipientName = rule.recipientType === 'viewer' ? 'Viewers' : 'Admins';
          const vars = { propertyName: pName, year: r.year, dueDate: fmtDate(r.dueDate), balance: fmtMoney(r.annualAmount) };
          items.push({ key, ruleId: rule.id, type: rule.type, ruleName: rule.name, recipientEmail: userEmails, recipientName, propertyName: pName, subject: fill(rule.subject, vars), body: fill(rule.body, vars), daysUntil: d, urgent: d <= 7 });
        }
      }
    }
    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [rules, tenants, properties, taxes, hoa, sent, users]);

  const sendNotif = async (item) => {
    if (!gmailConnected) {
      const mailto = `mailto:${encodeURIComponent(item.recipientEmail)}?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(item.body)}`;
      window.open(mailto);
      setHistory(prev => [...prev, { ...item, status: 'sent', sentAt: new Date().toISOString() }]);
      return;
    }
    setSending(item.key);
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: item.recipientEmail, subject: item.subject, body: item.body }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || res.statusText); }
      setHistory(prev => [...prev, { ...item, status: 'sent', sentAt: new Date().toISOString() }]);
    } catch (e) {
      alert(`Failed to send: ${e.message}`);
    } finally {
      setSending(null);
    }
  };

  const dismissNotif = (item) => {
    setHistory(prev => [...prev, { ...item, status: 'dismissed', sentAt: new Date().toISOString() }]);
  };

  const sendCustom = async () => {
    if (!customRecipient || !customSubject) return;
    const entry = { key: `custom_${Date.now()}`, type: 'custom', ruleName: 'Custom', recipientEmail: customRecipient, recipientName: customRecipient, subject: customSubject, body: customBody };
    if (!gmailConnected) {
      const mailto = `mailto:${encodeURIComponent(customRecipient)}?subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(customBody)}`;
      window.open(mailto);
      setHistory(prev => [...prev, { ...entry, status: 'sent', sentAt: new Date().toISOString() }]);
      setCustomRecipient(''); setCustomSubject(''); setCustomBody('');
      return;
    }
    setSending('custom');
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: customRecipient, subject: customSubject, body: customBody }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || res.statusText); }
      setHistory(prev => [...prev, { ...entry, status: 'sent', sentAt: new Date().toISOString() }]);
      setCustomRecipient(''); setCustomSubject(''); setCustomBody('');
    } catch (e) {
      alert(`Failed to send: ${e.message}`);
    } finally {
      setSending(null);
    }
  };

  const TYPE_LABEL = { lease_expiry: 'Lease Expiry', rent_reminder: 'Rent Reminder', tax_due: 'Property Tax', hoa_due: 'HOA Dues', custom: 'Custom' };
  const inputCls = 'w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white';

  return (
    <div className="p-8">
      {(showNewRule || editRule) && (
        <RuleModal rule={editRule} onClose={() => { setShowNewRule(false); setEditRule(null); }}
          onSave={r => { if (editRule) setRules(prev => prev.map(x => x.id === r.id ? r : x)); else setRules(prev => [...prev, r]); }} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 text-sm mt-1">Automated and manual email notifications</p>
        </div>
        {queue.length > 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-2 rounded-lg">
            <Bell size={15} /> {queue.length} pending
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {['queue', 'compose', 'rules', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-emerald-500 text-white' : 'bg-navy-800 text-slate-400 hover:text-white border border-navy-700'}`}>
            {t === 'queue' ? `Queue${queue.length ? ` (${queue.length})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* QUEUE */}
      {tab === 'queue' && (
        <div className="space-y-3">
          {queue.length === 0 && (
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center text-slate-500">
              <Bell size={36} className="mx-auto mb-3 opacity-30" />
              <div>No pending notifications</div>
            </div>
          )}
          {queue.map(item => (
            <div key={item.key} className={`bg-navy-800 border rounded-xl p-5 ${item.urgent ? 'border-yellow-500/40' : 'border-navy-700'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.urgent && <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />}
                    <span className="text-xs text-slate-500 bg-navy-700 px-2 py-0.5 rounded">{TYPE_LABEL[item.type]}</span>
                    <span className={`text-xs font-medium ${item.daysUntil <= 7 ? 'text-yellow-400' : 'text-slate-400'}`}>
                      {item.daysUntil === 0 ? 'Today' : `${item.daysUntil}d`}
                    </span>
                  </div>
                  <div className="font-medium text-white text-sm">{item.subject}</div>
                  <div className="text-xs text-slate-500 mt-0.5">To: {item.recipientName} {item.recipientEmail && `<${item.recipientEmail}>`} · {item.propertyName}</div>
                  <div className="text-xs text-slate-600 mt-2 line-clamp-2 font-mono">{item.body.split('\n')[0]}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => sendNotif(item)} disabled={sending === item.key}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs rounded-lg font-medium">
                    {sending === item.key ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
                    {sending === item.key ? 'Sending…' : (gmailConnected ? 'Send' : 'Open Email')}
                  </button>
                  <button onClick={() => dismissNotif(item)} disabled={sending === item.key}
                    className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-slate-400 text-xs rounded-lg">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPOSE */}
      {tab === 'compose' && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-white mb-2">Compose Email</h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">To (email addresses, comma-separated)</label>
            <input value={customRecipient} onChange={e => setCustomRecipient(e.target.value)} placeholder="tenant@email.com" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Subject</label>
            <input value={customSubject} onChange={e => setCustomSubject(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Body</label>
            <textarea value={customBody} onChange={e => setCustomBody(e.target.value)} rows={8} className={`${inputCls} resize-none`} />
          </div>
          <button onClick={sendCustom} disabled={!customRecipient || !customSubject || sending === 'custom'}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
            {sending === 'custom' ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
            {sending === 'custom' ? 'Sending…' : gmailConnected ? 'Send Email' : 'Open in Email Client'}
          </button>
        </div>
      )}

      {/* RULES */}
      {tab === 'rules' && (
        <div>
          <div className="flex justify-end mb-4">
            {canEdit && <button onClick={() => setShowNewRule(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Add Rule</button>}
          </div>
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5 flex items-start gap-4">
                <button onClick={() => canEdit && setRules(prev => prev.map(r => r.id === rule.id ? {...r, active: !r.active} : r))}
                  className={`flex-shrink-0 mt-0.5 ${rule.active ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {rule.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{rule.name}</span>
                    <span className="text-xs text-slate-500 bg-navy-700 px-2 py-0.5 rounded">{TYPE_LABEL[rule.type]}</span>
                    <span className="text-xs text-slate-500">→ {rule.recipientType === 'tenant' ? 'Tenants' : rule.recipientType === 'viewer' ? 'Viewers' : 'Admins'}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{rule.subject}</div>
                </div>
                {canEdit && (
                  <button onClick={() => setEditRule(rule)} className="text-slate-400 hover:text-white flex-shrink-0">
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
                <th className="text-left px-5 py-3">Time</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Recipient</th>
                <th className="text-left px-5 py-3">Subject</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {[...history].reverse().slice(0, 100).map((h, i) => (
                <tr key={i} className="hover:bg-navy-700/40">
                  <td className="px-5 py-2.5 text-slate-400 text-xs whitespace-nowrap">{h.sentAt ? new Date(h.sentAt).toLocaleString() : '—'}</td>
                  <td className="px-5 py-2.5 text-xs"><span className="bg-navy-700 text-slate-400 px-2 py-0.5 rounded">{TYPE_LABEL[h.type] || h.type}</span></td>
                  <td className="px-5 py-2.5 text-slate-400 text-xs">{h.recipientEmail}</td>
                  <td className="px-5 py-2.5 text-white text-xs truncate max-w-xs">{h.subject}</td>
                  <td className="px-5 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${h.status === 'sent' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-400/10 text-slate-400'}`}>{h.status}</span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No notification history yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

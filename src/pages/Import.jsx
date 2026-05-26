import { useState, useRef, useEffect } from 'react';
import { Upload, Check, AlertCircle, RefreshCw, Landmark } from 'lucide-react';
import { TRANSACTION_CATEGORIES } from '../data/sampleData';
import { useAppData } from '../context/AppData';
import { sortByStreetName } from '../utils/sort';

function parseLine(line) {
  const fields = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]).map(h => h.toLowerCase());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

function normalizeDate(str) {
  if (!str) return new Date().toISOString().slice(0, 10);
  const s = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  const mdyShort = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyShort) {
    const yr = parseInt(mdyShort[3]) > 50 ? `19${mdyShort[3]}` : `20${mdyShort[3]}`;
    return `${yr}-${mdyShort[1].padStart(2, '0')}-${mdyShort[2].padStart(2, '0')}`;
  }
  return s;
}

function guessField(row, candidates) {
  for (const c of candidates) { if (row[c] !== undefined) return c; }
  return '';
}

const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Import() {
  const { transactions, bulkAddTransactions, updateTransaction, deleteTransaction, properties, settings, saveSetting } = useAppData();
  const [mode, setMode] = useState('bank');

  // ── CSV state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ date: '', description: '', amount: '', type: '', category: '' });
  const [defaultType, setDefaultType] = useState('Expense');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [defaultProperty, setDefaultProperty] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setCsvError('Please upload a .csv file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (!parsed.length) { setCsvError('CSV appears empty'); return; }
        const hdrs = Object.keys(parsed[0]);
        setHeaders(hdrs); setRows(parsed);
        setMapping({
          date: guessField(parsed[0], ['date', 'transaction date', 'posted date']),
          description: guessField(parsed[0], ['description', 'memo', 'name', 'payee']),
          amount: guessField(parsed[0], ['amount', 'debit', 'credit', 'transaction amount']),
          type: guessField(parsed[0], ['type', 'transaction type']),
          category: guessField(parsed[0], ['category', 'sub category']),
        });
        setCsvError(''); setStep('map');
      } catch { setCsvError('Failed to parse CSV.'); }
    };
    reader.readAsText(file);
  };

  const buildRow = (row, i) => ({
    id: crypto.randomUUID(),
    date: normalizeDate(row[mapping.date]),
    description: row[mapping.description] || 'Imported transaction',
    amount: Math.abs(parseFloat((row[mapping.amount] || '0').replace(/[^0-9.-]/g, '')) || 0),
    type: row[mapping.type] ? (row[mapping.type].toLowerCase().includes('credit') ? 'Income' : 'Expense') : defaultType,
    category: row[mapping.category] || defaultCategory,
    propertyId: defaultProperty, notes: 'Imported from CSV',
  });

  // Three-tier dedup: SF id → exact description+type fingerprint → date+amount only (cross-source)
  // Type is intentionally excluded from the cross-source key because credit card payments show as
  // Income in SimpleFIN (positive amount) but Expense in Chase CSV exports ("Payment" type).
  const buildDedupSets = (txList) => ({
    sfIds:       new Set(txList.filter(t => t.sfTxId).map(t => t.sfTxId)),
    fullKeys:    new Set(txList.map(t => `${t.date}|${t.description}|${Number(t.amount)}|${t.type}`)),
    dateAmtKeys: new Set(txList.map(t => `${t.date}|${Number(t.amount)}`)),
  });
  const existingKeys  = () => new Set(transactions.map(tx => `${tx.date}|${tx.description}|${Number(tx.amount)}|${tx.type}`));
  const existingSfIds = () => new Set(transactions.filter(t => t.sfTxId).map(t => t.sfTxId));
  const isDupe = (tx, keys) => {
    if (tx.sfTxId && existingSfIds().has(tx.sfTxId)) return true;
    if (keys.has(`${tx.date}|${tx.description}|${Number(tx.amount)}|${tx.type}`)) return true;
    const dak = new Set(transactions.map(t => `${t.date}|${Number(t.amount)}`));
    return dak.has(`${tx.date}|${Number(tx.amount)}`);
  };

  const [csvSkipped, setCsvSkipped] = useState(0);
  const buildPreview = () => { setPreview(rows.slice(0, 20).map(buildRow)); setStep('preview'); };
  const doImport = async () => {
    const keys = existingKeys();
    const all = rows.map(buildRow);
    const fresh = all.filter(tx => !isDupe(tx, keys));
    setCsvSkipped(all.length - fresh.length);
    await bulkAddTransactions(fresh);
    setStep('done');
  };
  const resetCsv = () => { setStep('upload'); setRows([]); setHeaders([]); setPreview([]); setCsvError(''); setCsvSkipped(0); if (fileRef.current) fileRef.current.value = ''; };
  const csvSteps = ['upload', 'map', 'preview', 'done'];

  const isValidDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test((str ?? '').trim());

  const [cleanupResult, setCleanupResult] = useState(null);
  const cleanup = () => {
    const seen = new Set();
    const toDelete = [];
    transactions.forEach(tx => {
      const key = `${tx.date}|${tx.description}|${String(tx.amount)}|${tx.type}`;
      if (seen.has(key)) toDelete.push(tx.id);
      else seen.add(key);
    });
    toDelete.forEach(id => deleteTransaction(id));
    setCleanupResult(toDelete.length);
  };

  const [fixCount, setFixCount] = useState(null);
  const fixDates = async () => {
    let fixed = 0;
    for (const tx of transactions) {
      const normalized = normalizeDate(tx.date);
      if (normalized !== tx.date) {
        fixed++;
        await updateTransaction({ ...tx, date: normalized });
      }
    }
    setFixCount(fixed);
  };

  const [removeCount, setRemoveCount] = useState(null);
  const csvImported = transactions.filter(tx => tx.notes === 'Imported from CSV');
  const removeCsvImports = () => {
    if (!csvImported.length) { setRemoveCount(0); return; }
    if (!confirm(`Delete all ${csvImported.length} CSV-imported transactions? You can re-import the files to replace them.`)) return;
    csvImported.forEach(tx => deleteTransaction(tx.id));
    setRemoveCount(csvImported.length);
  };

  // ── SimpleFIN state ────────────────────────────────────────────────────────
  const sfAccessUrl = settings?.simplefin_url || '';
  const setSfAccessUrl = (url) => saveSetting('simplefin_url', url);
  const [sfStep, setSfStep] = useState('connect');
  useEffect(() => { if (sfAccessUrl) setSfStep(s => s === 'connect' ? 'sync' : s); }, [sfAccessUrl]);
  const [sfToken, setSfToken] = useState('');
  const [sfConnecting, setSfConnecting] = useState(false);
  const [sfSyncing, setSfSyncing] = useState(false);
  const [sfError, setSfError] = useState('');
  const [sfAccounts, setSfAccounts] = useState([]);
  const [sfPreview, setSfPreview] = useState([]);
  const [sfStartDate, setSfStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [sfProperty, setSfProperty] = useState('');

  async function sfClaim() {
    setSfConnecting(true);
    setSfError('');
    try {
      const claimUrl = atob(sfToken.trim());
      const res = await fetch(claimUrl, { method: 'POST' });
      if (!res.ok) throw new Error(`Claim failed (${res.status})`);
      const accessUrl = (await res.text()).trim();
      await setSfAccessUrl(accessUrl);
      setSfStep('sync');
    } catch (e) {
      setSfError(e.message || 'Could not connect — check your token and try again.');
    } finally {
      setSfConnecting(false);
    }
  }

  async function sfSync() {
    setSfSyncing(true);
    setSfError('');
    try {
      const u = new URL(sfAccessUrl);
      const auth = btoa(`${u.username}:${u.password}`);
      const base = `${u.protocol}//${u.host}${u.pathname}`;
      const startTs = Math.floor(new Date(sfStartDate).getTime() / 1000);
      const res = await fetch(`${base}/accounts?start-date=${startTs}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) throw new Error(`API error (${res.status})`);
      const data = await res.json();
      const accounts = (data.accounts || []).filter(a => a.org?.name?.toLowerCase().includes('chase'));
      setSfAccounts(accounts);
      const txs = accounts.flatMap(acct =>
        (acct.transactions || []).map((tx, i) => {
          const amount = parseFloat(tx.amount);
          return {
            id: crypto.randomUUID(),
            sfTxId: tx.id,
            date: new Date(tx.posted * 1000).toISOString().slice(0, 10),
            description: tx.description || tx.memo || 'Bank transaction',
            amount: Math.abs(amount),
            type: amount >= 0 ? 'Income' : 'Expense',
            category: '',
            propertyId: sfProperty,
            notes: `SimpleFIN — ${acct.name}`,
          };
        })
      );
      const keys = existingKeys();
      setSfPreview(txs.map(tx => ({ ...tx, _dupe: isDupe(tx, keys) })));
      setSfStep('preview');
    } catch (e) {
      setSfError(e.message || 'Sync failed. Your connection may have expired — try disconnecting and reconnecting.');
    } finally {
      setSfSyncing(false);
    }
  }

  async function sfImport() {
    const { sfIds, fullKeys, dateAmtKeys } = buildDedupSets(transactions);
    const fresh = sfPreview
      .filter(tx => !tx._dupe)
      .filter(tx => {
        if (tx.sfTxId && sfIds.has(tx.sfTxId)) return false;
        if (fullKeys.has(`${tx.date}|${tx.description}|${Number(tx.amount)}|${tx.type}`)) return false;
        return !dateAmtKeys.has(`${tx.date}|${Number(tx.amount)}`);
      })
      .map(({ _dupe, ...tx }) => tx);
    await bulkAddTransactions(fresh);
    setSfStep('done');
  }

  async function sfDisconnect() {
    await setSfAccessUrl('');
    setSfStep('connect');
    setSfAccounts([]);
    setSfPreview([]);
    setSfError('');
    setSfToken('');
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Import Transactions</h1>
        <p className="text-slate-400 text-sm mt-1">Sync from your bank or upload a CSV file</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-8 p-1 bg-navy-800 border border-navy-700 rounded-lg w-fit">
        <button
          onClick={() => setMode('bank')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${mode === 'bank' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Landmark size={13} /> Bank Sync
        </button>
        <button
          onClick={() => setMode('csv')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${mode === 'csv' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Upload size={13} /> CSV Upload
        </button>
      </div>

      {/* ═══ BANK SYNC ═══════════════════════════════════════════════════════ */}
      {mode === 'bank' && (
        <div>
          {sfStep === 'connect' && (
            <div className="space-y-5">
              <div className="p-5 bg-navy-800 border border-navy-700 rounded-xl space-y-3">
                <h2 className="text-white font-semibold flex items-center gap-2"><Landmark size={16} className="text-emerald-400" /> Connect Chase via SimpleFIN</h2>
                <ol className="text-slate-400 text-sm space-y-1.5 list-decimal list-inside">
                  <li>Go to <span className="text-emerald-400 font-mono text-xs">beta-bridge.simplefin.org</span> and create a free account</li>
                  <li>Click <strong className="text-white">Connect Account</strong> and link your Chase bank</li>
                  <li>Click <strong className="text-white">+ Add Application Token</strong> and copy the token</li>
                  <li>Paste it below and click Connect</li>
                </ol>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">SimpleFIN Setup Token</label>
                <textarea
                  value={sfToken}
                  onChange={e => setSfToken(e.target.value)}
                  placeholder="Paste your setup token here..."
                  className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white font-mono h-24 resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>
              {sfError && (
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />{sfError}
                </div>
              )}
              <button
                onClick={sfClaim}
                disabled={!sfToken.trim() || sfConnecting}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                {sfConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}

          {sfStep === 'sync' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <Check size={15} /> Chase connected via SimpleFIN
                </div>
                <button onClick={sfDisconnect} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                  Disconnect
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Fetch transactions since</label>
                  <input
                    type="date"
                    value={sfStartDate}
                    onChange={e => setSfStartDate(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Assign to Property</label>
                  <select
                    value={sfProperty}
                    onChange={e => setSfProperty(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">— General —</option>
                    {sortByStreetName(properties).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              {sfError && (
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />{sfError}
                </div>
              )}
              <button
                onClick={sfSync}
                disabled={sfSyncing}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw size={14} className={sfSyncing ? 'animate-spin' : ''} />
                {sfSyncing ? 'Syncing...' : 'Sync Transactions'}
              </button>
            </div>
          )}

          {sfStep === 'preview' && (() => {
            const sfFresh = sfPreview.filter(tx => !tx._dupe);
            const sfDupes = sfPreview.length - sfFresh.length;
            return (
            <div className="space-y-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm flex items-center gap-2">
                <AlertCircle size={14} />
                {sfFresh.length} new transaction{sfFresh.length !== 1 ? 's' : ''} from {sfAccounts.length} account{sfAccounts.length !== 1 ? 's' : ''}.
                {sfDupes > 0 && <span className="text-slate-400">{sfDupes} already imported will be skipped.</span>}
              </div>
              <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Description</th>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-right px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-700">
                    {sfPreview.slice(0, 50).map((tx, i) => (
                      <tr key={i} className={tx._dupe ? 'opacity-35' : ''}>
                        <td className="px-4 py-2 text-slate-300">{tx.date}</td>
                        <td className="px-4 py-2 text-white">{tx.description}{tx._dupe && <span className="ml-2 text-xs text-slate-500 italic">duplicate</span>}</td>
                        <td className={`px-4 py-2 ${tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.type}</td>
                        <td className="px-4 py-2 text-right text-white">{fmt(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sfPreview.length > 50 && (
                <p className="text-xs text-slate-500">Showing first 50 of {sfPreview.length}.</p>
              )}
              <div className="flex justify-between">
                <button onClick={() => setSfStep('sync')} className="text-slate-400 hover:text-white text-sm">← Back</button>
                <button
                  onClick={sfImport}
                  disabled={sfFresh.length === 0}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
                >
                  Import {sfFresh.length} Transaction{sfFresh.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
            );
          })()}

          {sfStep === 'done' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Import Complete!</h2>
              <p className="text-slate-400 text-sm mb-6">{sfPreview.filter(tx => !tx._dupe).length} transactions added{sfPreview.some(tx => tx._dupe) ? `, ${sfPreview.filter(tx => tx._dupe).length} duplicates skipped` : ''}.</p>
              <button
                onClick={() => setSfStep('sync')}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
              >
                Sync Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ CSV UPLOAD ══════════════════════════════════════════════════════ */}
      {mode === 'csv' && (
        <div>
          <div className="flex items-center gap-2 mb-8 text-xs">
            {csvSteps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-navy-700" />}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${step === s ? 'bg-emerald-500/20 text-emerald-400 font-medium' : csvSteps.indexOf(step) > i ? 'text-slate-400' : 'text-slate-600'}`}>
                  {csvSteps.indexOf(step) > i ? <Check size={12} /> : <span>{i + 1}</span>}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </div>
              </div>
            ))}
          </div>

          {step === 'upload' && (
            <div>
              <label className="flex flex-col items-center justify-center w-full h-48 bg-navy-800 border-2 border-dashed border-navy-600 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                <Upload size={32} className="text-slate-500 mb-3" />
                <span className="text-slate-400 text-sm">Drop a CSV file here, or click to browse</span>
                <span className="text-slate-600 text-xs mt-1">Supports bank exports, QuickBooks, and generic CSV</span>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </label>
              {csvError && <div className="mt-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={14} />{csvError}</div>}
              <div className="mt-6 p-4 bg-navy-800 border border-navy-700 rounded-xl">
                <div className="text-xs font-medium text-slate-400 mb-2">Expected CSV format:</div>
                <pre className="text-xs text-slate-500 font-mono">{`Date,Description,Amount,Type,Category\n2026-05-01,Rent Payment,2200.00,Income,Rent\n2026-05-05,Plumber,320.00,Expense,Repairs`}</pre>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <div className="p-4 bg-navy-800 border border-navy-700 rounded-xl">
                <div className="text-sm text-slate-300 mb-1">Found <strong className="text-white">{rows.length}</strong> rows</div>
                <div className="text-xs text-slate-500">Map CSV columns to transaction fields</div>
              </div>
              {[['date','Date column',true],['description','Description column',true],['amount','Amount column',true],['type','Type column',false],['category','Category column',false]].map(([field, label, req]) => (
                <div key={field}>
                  <label className="text-xs text-slate-400 block mb-1">{label}{req && ' *'}</label>
                  <select value={mapping[field]} onChange={e => setMapping({ ...mapping, [field]: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">— Not mapped —</option>{headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-navy-700">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Default Type</label>
                  <select value={defaultType} onChange={e => setDefaultType(e.target.value)} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option>Income</option><option>Expense</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Default Category</label>
                  <select value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">— No category —</option>
                    {TRANSACTION_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Assign to Property</label>
                  <select value={defaultProperty} onChange={e => setDefaultProperty(e.target.value)} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">— General —</option>{sortByStreetName(properties).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={resetCsv} className="text-slate-400 hover:text-white text-sm">← Back</button>
                <button onClick={buildPreview} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Preview Import →</button>
              </div>
            </div>
          )}

          {step === 'preview' && (() => {
            const keys = existingKeys();
            const previewDupes = preview.filter(tx => isDupe(tx, keys)).length;
            const totalDupes = rows.map(buildRow).filter(tx => isDupe(tx, keys)).length;
            const totalFresh = rows.length - totalDupes;
            return (
            <div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm mb-4 flex items-center gap-2">
                <AlertCircle size={14} />
                {totalFresh} new of {rows.length} rows will be imported.
                {totalDupes > 0 && <span className="text-slate-400">{totalDupes} duplicates will be skipped.</span>}
              </div>
              <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-700 text-slate-400 text-xs uppercase">
                      <th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Description</th><th className="text-left px-4 py-2">Type</th><th className="text-right px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-700">
                    {preview.map((tx, i) => {
                      const dupe = isDupe(tx, keys);
                      return (
                        <tr key={i} className={dupe ? 'opacity-35' : ''}>
                          <td className="px-4 py-2 text-slate-300">{tx.date}</td>
                          <td className="px-4 py-2 text-white">{tx.description}{dupe && <span className="ml-2 text-xs text-slate-500 italic">duplicate</span>}</td>
                          <td className={`px-4 py-2 ${tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.type}</td>
                          <td className="px-4 py-2 text-right text-white">{fmt(tx.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep('map')} className="text-slate-400 hover:text-white text-sm">← Back</button>
                <button onClick={doImport} disabled={totalFresh === 0} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium">
                  Import {totalFresh} Transaction{totalFresh !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
            );
          })()}

          {step === 'done' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-emerald-400" /></div>
              <h2 className="text-xl font-semibold text-white mb-2">Import Complete!</h2>
              <p className="text-slate-400 text-sm mb-6">
                {rows.length - csvSkipped} transactions added{csvSkipped > 0 ? `, ${csvSkipped} duplicate${csvSkipped !== 1 ? 's' : ''} skipped` : ''}.
              </p>
              <button onClick={resetCsv} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Import Another File</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ DATA REPAIR ═════════════════════════════════════════════════════ */}
      {transactions.length > 0 && (
        <div className="mt-12 pt-8 border-t border-navy-700">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Data Repair</h2>
          <div className="flex items-center justify-between p-4 bg-navy-800 border border-navy-700 rounded-xl">
            <div>
              <p className="text-sm text-white">Fix transaction date formats</p>
              <p className="text-xs text-slate-500 mt-0.5">Converts MM/DD/YYYY dates from prior imports to YYYY-MM-DD</p>
            </div>
            <button
              onClick={fixDates}
              className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium shrink-0 ml-4"
            >
              Fix Dates
            </button>
          </div>
          {fixCount !== null && (
            <p className="mt-2 text-sm text-emerald-400 flex items-center gap-1.5">
              <Check size={14} /> {fixCount === 0 ? 'All dates are already correct.' : `Fixed ${fixCount} transaction${fixCount !== 1 ? 's' : ''}.`}
            </p>
          )}
          <div className="flex items-center justify-between p-4 bg-navy-800 border border-navy-700 rounded-xl mt-3">
            <div>
              <p className="text-sm text-white">Delete all CSV-imported transactions</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Removes {csvImported.length} CSV-imported transaction{csvImported.length !== 1 ? 's' : ''} so you can re-import your files cleanly
              </p>
            </div>
            <button
              onClick={removeCsvImports}
              disabled={csvImported.length === 0}
              className="px-4 py-2 bg-navy-700 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-lg text-sm font-medium shrink-0 ml-4 transition-colors"
            >
              Delete All
            </button>
          </div>
          {removeCount !== null && (
            <p className="mt-2 text-sm text-emerald-400 flex items-center gap-1.5">
              <Check size={14} /> {removeCount === 0 ? 'No CSV-imported transactions found.' : `Deleted ${removeCount} transaction${removeCount !== 1 ? 's' : ''}. Re-import your CSV files to replace them.`}
            </p>
          )}
          <div className="flex items-center justify-between p-4 bg-navy-800 border border-navy-700 rounded-xl mt-3">
            <div>
              <p className="text-sm text-white">Clean up transactions</p>
              <p className="text-xs text-slate-500 mt-0.5">Removes content duplicates (same date + description + amount + type) and reassigns all IDs — fixes the exclude bug</p>
            </div>
            <button
              onClick={cleanup}
              className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium shrink-0 ml-4 transition-colors"
            >
              Clean Up
            </button>
          </div>
          {cleanupResult !== null && (
            <p className="mt-2 text-sm text-emerald-400 flex items-center gap-1.5">
              <Check size={14} /> {cleanupResult === 0 ? 'No duplicates found. All IDs reassigned.' : `Removed ${cleanupResult} duplicate${cleanupResult !== 1 ? 's' : ''} and reassigned all IDs.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

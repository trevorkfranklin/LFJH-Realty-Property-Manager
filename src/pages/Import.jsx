import { useState, useRef } from 'react';
import { Upload, Check, X, AlertCircle } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sampleTransactions, sampleProperties, TRANSACTION_CATEGORIES } from '../data/sampleData';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function guessField(row, candidates) {
  for (const c of candidates) { if (row[c] !== undefined) return c; }
  return '';
}

export default function Import() {
  const [transactions, setTransactions] = useLocalStorage('lfjh_transactions', sampleTransactions);
  const [properties] = useLocalStorage('lfjh_properties', sampleProperties);
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ date: '', description: '', amount: '', type: '', category: '' });
  const [defaultType, setDefaultType] = useState('Expense');
  const [defaultCategory, setDefaultCategory] = useState('Other Expense');
  const [defaultProperty, setDefaultProperty] = useState('');
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Please upload a .csv file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (!parsed.length) { setError('CSV appears empty'); return; }
        const hdrs = Object.keys(parsed[0]);
        setHeaders(hdrs); setRows(parsed);
        setMapping({
          date: guessField(parsed[0], ['date', 'transaction date', 'posted date']),
          description: guessField(parsed[0], ['description', 'memo', 'name', 'payee']),
          amount: guessField(parsed[0], ['amount', 'debit', 'credit', 'transaction amount']),
          type: guessField(parsed[0], ['type', 'transaction type']),
          category: guessField(parsed[0], ['category', 'sub category']),
        });
        setError(''); setStep('map');
      } catch { setError('Failed to parse CSV.'); }
    };
    reader.readAsText(file);
  };

  const buildRow = (row, i) => ({
    id: `import_${Date.now()}_${i}`,
    date: row[mapping.date] || new Date().toISOString().slice(0, 10),
    description: row[mapping.description] || 'Imported transaction',
    amount: Math.abs(parseFloat((row[mapping.amount] || '0').replace(/[^0-9.-]/g, '')) || 0),
    type: row[mapping.type] ? (row[mapping.type].toLowerCase().includes('credit') ? 'Income' : 'Expense') : defaultType,
    category: row[mapping.category] || defaultCategory,
    propertyId: defaultProperty, notes: 'Imported from CSV',
  });

  const buildPreview = () => { setPreview(rows.slice(0, 20).map(buildRow)); setStep('preview'); };
  const doImport = () => { setTransactions([...transactions, ...rows.map(buildRow)]); setStep('done'); };
  const reset = () => { setStep('upload'); setRows([]); setHeaders([]); setPreview([]); setError(''); if (fileRef.current) fileRef.current.value = ''; };
  const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const steps = ['upload', 'map', 'preview', 'done'];

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8"><h1 className="text-2xl font-bold text-white">Import Transactions</h1><p className="text-slate-400 text-sm mt-1">Upload a CSV file from your bank or accounting software</p></div>
      <div className="flex items-center gap-2 mb-8 text-xs">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-navy-700" />}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${step === s ? 'bg-emerald-500/20 text-emerald-400 font-medium' : steps.indexOf(step) > i ? 'text-slate-400' : 'text-slate-600'}`}>
              {steps.indexOf(step) > i ? <Check size={12} /> : <span>{i + 1}</span>}
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
          {error && <div className="mt-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={14} />{error}</div>}
          <div className="mt-6 p-4 bg-navy-800 border border-navy-700 rounded-xl">
            <div className="text-xs font-medium text-slate-400 mb-2">Expected CSV format:</div>
            <pre className="text-xs text-slate-500 font-mono">{`Date,Description,Amount,Type,Category\n2026-05-01,Rent Payment,2200.00,Income,Rent\n2026-05-05,Plumber,320.00,Expense,Repairs`}</pre>
          </div>
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <div className="p-4 bg-navy-800 border border-navy-700 rounded-xl"><div className="text-sm text-slate-300 mb-1">Found <strong className="text-white">{rows.length}</strong> rows</div><div className="text-xs text-slate-500">Map CSV columns to transaction fields</div></div>
          {[['date','Date column',true],['description','Description column',true],['amount','Amount column',true],['type','Type column',false],['category','Category column',false]].map(([field, label, req]) => (
            <div key={field}><label className="text-xs text-slate-400 block mb-1">{label}{req && ' *'}</label>
              <select value={mapping[field]} onChange={e => setMapping({ ...mapping, [field]: e.target.value })} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">— Not mapped —</option>{headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select></div>
          ))}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-navy-700">
            <div><label className="text-xs text-slate-400 block mb-1">Default Type</label>
              <select value={defaultType} onChange={e => setDefaultType(e.target.value)} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white"><option>Income</option><option>Expense</option></select></div>
            <div><label className="text-xs text-slate-400 block mb-1">Default Category</label>
              <select value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">{TRANSACTION_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Assign to Property</label>
              <select value={defaultProperty} onChange={e => setDefaultProperty(e.target.value)} className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">— General —</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={reset} className="text-slate-400 hover:text-white text-sm">← Back</button>
            <button onClick={buildPreview} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Preview Import →</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm mb-4 flex items-center gap-2"><AlertCircle size={14} /> Showing first 20 of {rows.length} rows. All rows will be imported.</div>
          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy-700 text-slate-400 text-xs uppercase"><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Description</th><th className="text-left px-4 py-2">Type</th><th className="text-right px-4 py-2">Amount</th></tr></thead>
              <tbody className="divide-y divide-navy-700">{preview.map((tx, i) => (<tr key={i}><td className="px-4 py-2 text-slate-300">{tx.date}</td><td className="px-4 py-2 text-white">{tx.description}</td><td className={`px-4 py-2 ${tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.type}</td><td className="px-4 py-2 text-right text-white">{fmt(tx.amount)}</td></tr>))}</tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep('map')} className="text-slate-400 hover:text-white text-sm">← Back</button>
            <button onClick={doImport} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Import {rows.length} Transactions</button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-emerald-400" /></div>
          <h2 className="text-xl font-semibold text-white mb-2">Import Complete!</h2>
          <p className="text-slate-400 text-sm mb-6">{rows.length} transactions added.</p>
          <button onClick={reset} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">Import Another File</button>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Trash2, ChevronDown } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAppData } from '../context/AppData';
import { sortByStreetName } from '../utils/sort';

const FREE_MODELS = [
  { id: 'deepseek/deepseek-v4-flash',                          label: 'DeepSeek V4 Flash' },
  { id: 'google/gemma-4-31b-it:free',                          label: 'Google Gemma 4 31B' },
  { id: 'openai/gpt-oss-120b:free',                            label: 'OpenAI GPT-OSS 120B' },
  { id: 'openai/gpt-oss-20b:free',                             label: 'OpenAI GPT-OSS 20B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free',              label: 'NVIDIA Nemotron 3 Super 120B' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free',                 label: 'NVIDIA Nemotron 3 Nano 30B' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',  label: 'NVIDIA Nemotron 3 Nano Omni' },
  { id: 'nvidia/nemotron-nano-9b-v2:free',                     label: 'NVIDIA Nemotron Nano 9B' },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free',                 label: 'NVIDIA Nemotron Nano 12B VL' },
  { id: 'minimax/minimax-m2.5:free',                           label: 'MiniMax M2.5' },
  { id: 'z-ai/glm-4.5-air:free',                               label: 'Z.ai GLM 4.5 Air' },
  { id: 'arcee-ai/trinity-large-thinking:free',                label: 'Arcee Trinity Large Thinking' },
  { id: 'poolside/laguna-m.1:free',                            label: 'Poolside Laguna M.1' },
  { id: 'poolside/laguna-xs.2:free',                           label: 'Poolside Laguna XS.2' },
  { id: 'baidu/cobuddy:free',                                  label: 'Baidu CoBuddy' },
  { id: 'openrouter/owl-alpha',                                label: 'OpenRouter Owl Alpha' },
];

const SUGGESTED = [
  'Summarize my portfolio performance this year',
  'Which property has the highest net income?',
  'Are any leases expiring soon?',
  'What is my total equity across all properties?',
  'Give me a cashflow forecast for the next 6 months',
  'What real estate tax deductions should I be aware of?',
];

function buildContext(properties, tenants, transactions, taxes, hoa, rentcastData, sfAccounts) {
  const fmtM = (n) => n ? `$${Number(n).toLocaleString()}` : '—';
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  // Properties
  const propLines = sortByStreetName(properties).map(p => {
    const rc = rentcastData[p.id];
    const mortAcct = p.mortgageAccountId ? sfAccounts[p.mortgageAccountId] : null;
    const activeTenant = tenants.find(t => t.propertyId === p.id && t.status === 'Active');
    return [
      `  • ${p.name} (${p.address})`,
      `    Status: ${p.status} | Type: ${p.type} | ${p.bedrooms}bd/${p.bathrooms}ba | ${p.sqft ? p.sqft.toLocaleString() + ' sqft' : ''}`,
      `    Purchase price: ${fmtM(p.purchasePrice)} | Monthly rent: ${fmtM(activeTenant?.monthlyRent || p.monthlyRent)}`,
      rc?.estimatedValue ? `    RentCast est. value: ${fmtM(rc.estimatedValue)} (range ${fmtM(rc.valueLow)}–${fmtM(rc.valueHigh)})` : '',
      rc?.estimatedRent ? `    RentCast est. rent: ${fmtM(rc.estimatedRent)}/mo` : '',
      mortAcct ? `    Mortgage balance: ${fmtM(mortAcct.balance)} (${mortAcct.orgName})` : '',
      p.hoa ? `    HOA: ${p.hoa}` : '',
      p.mudDistrict ? `    MUD: ${p.mudDistrict}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  // Active tenants
  const tenantLines = tenants.filter(t => t.status === 'Active').map(t => {
    const prop = properties.find(p => p.id === t.propertyId);
    const coNames = (t.coTenants || []).map(c => `${c.firstName} ${c.lastName}`).join(', ');
    const daysLeft = t.leaseEnd ? Math.ceil((new Date(t.leaseEnd) - new Date(today)) / 86400000) : null;
    return [
      `  • ${t.firstName} ${t.lastName}${coNames ? ` + ${coNames}` : ''} @ ${prop?.name || 'Unknown'}`,
      `    Rent: ${fmtM(t.monthlyRent)}/mo | Deposit: ${fmtM(t.depositPaid)}${t.petDeposit ? ` | Pet deposit: ${fmtM(t.petDeposit)}` : ''}`,
      `    Lease: ${t.leaseStart || '?'} → ${t.leaseEnd || '?'}${daysLeft !== null ? ` (${daysLeft > 0 ? `${daysLeft} days remaining` : 'EXPIRED'})` : ''}`,
      t.email ? `    Email: ${t.email} | Phone: ${t.phone}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  // YTD financials
  const yearTx = transactions.filter(t => !t.excluded && t.date.startsWith(String(currentYear)));
  const income    = yearTx.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses  = yearTx.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw').reduce((s, t) => s + Number(t.amount), 0);
  const ownerDraw = yearTx.filter(t => t.category === 'Owner Draw').reduce((s, t) => s + Number(t.amount), 0);
  const net       = income - expenses;

  // Per-property breakdown
  const propFinancials = sortByStreetName(properties).map(p => {
    const ptx = yearTx.filter(t => t.propertyId === p.id || t.splits?.some(s => s.propertyId === p.id));
    const pi = ptx.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0);
    const pe = ptx.filter(t => t.type === 'Expense' && t.category !== 'Owner Draw').reduce((s, t) => s + Number(t.amount), 0);
    return `  • ${p.name}: Income ${fmtM(pi)}, Expenses ${fmtM(pe)}, Net ${fmtM(pi - pe)}`;
  }).join('\n');

  // Recent transactions
  const recentTx = [...transactions]
    .filter(t => !t.excluded)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15)
    .map(t => {
      const prop = properties.find(p => p.id === t.propertyId);
      return `  • ${t.date} | ${t.type} | ${t.category || 'Uncategorized'} | ${fmtM(t.amount)} | ${t.description}${prop ? ` | ${prop.name}` : ''}`;
    }).join('\n');

  // Property taxes summary
  const taxLines = taxes.filter(t => t.annualAmount).map(t => {
    const prop = properties.find(p => p.id === t.propertyId);
    return `  • ${prop?.name} | ${t.taxYear} ${t.taxType || ''} | ${fmtM(t.annualAmount)} due ${t.dueDate || 'unknown'}`;
  }).join('\n');

  // HOA summary
  const hoaLines = hoa.filter(h => h.annualAmount).map(h => {
    const prop = properties.find(p => p.id === h.propertyId);
    return `  • ${prop?.name} | ${h.year} | ${fmtM(h.annualAmount)} due ${h.dueDate || 'unknown'}`;
  }).join('\n');

  return `# LFJH (aka LT²D) Realty, LLC — Portfolio Data (as of ${today})

## Properties (${properties.length} total)
${propLines || '  None'}

## Active Tenants (${tenants.filter(t => t.status === 'Active').length})
${tenantLines || '  None'}

## ${currentYear} Financials (YTD)
  Total Income:  ${fmtM(income)}
  Total Expenses: ${fmtM(expenses)}
  Owner Draw:    ${fmtM(ownerDraw)}
  Net Cashflow:  ${fmtM(net)}

### Per-Property Breakdown
${propFinancials || '  None'}

## Recent Transactions (last 15)
${recentTx || '  None'}

## Property Taxes
${taxLines || '  None'}

## HOA Dues
${hoaLines || '  None'}`;
}

export default function Chat() {
  const { properties, tenants, transactions, propertyTaxes: taxes, hoaDues: hoa } = useAppData();
  const [rentcastData] = useLocalStorage('lfjh_rentcast',          {});
  const [sfAccounts]   = useLocalStorage('lfjh_simplefin_accounts_v2',{});

  const [model, setModel]       = useState(FREE_MODELS[0].id);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const context = useMemo(() =>
    buildContext(properties, tenants, transactions, taxes, hoa, rentcastData, sfAccounts),
    [properties, tenants, transactions, taxes, hoa, rentcastData, sfAccounts]
  );

  const systemPrompt = `You are an expert real estate property management assistant for LFJH (aka LT²D) Realty, LLC. You have deep knowledge of:
- Real estate investment analysis, cap rates, cash-on-cash returns, NOI
- Property management best practices
- Texas property law and landlord/tenant regulations
- Tax strategies for real estate investors (depreciation, 1031 exchanges, deductions)
- Market analysis and rental pricing
- Lease negotiations and tenant relations
- Property maintenance and capital improvements

You have real-time access to the following live portfolio data. Use it to give specific, accurate answers.

${context}

Guidelines:
- Reference specific property names, dollar amounts, and dates from the data above
- Format currency clearly (e.g., $1,250/mo, $425,000)
- Be concise but thorough — the user is a busy real estate investor
- If asked about something not in the data, draw on your general real estate expertise
- Proactively flag issues you notice (expiring leases, low equity, etc.)`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setError('');

    const newMessages = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: true,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error ${res.status}: ${err}`);
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            assistantText += delta;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantText };
              return updated;
            });
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (e) {
      setError(e.message);
      setMessages(prev => prev.slice(0, -1)); // remove empty assistant message
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => { setMessages([]); setError(''); };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-navy-700 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
          <p className="text-slate-400 text-sm mt-0.5">Ask anything about your portfolio or real estate in general</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            {FREE_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <button onClick={clearChat} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm">
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                <Bot size={28} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-center text-slate-400 text-sm mb-8">
              I have full access to your portfolio data. Ask me anything about your properties, tenants, finances, or real estate strategy.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-sm text-slate-400 hover:text-white bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-xl px-4 py-3 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'} max-w-5xl ${m.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={16} className="text-emerald-400" />
              </div>
            )}
            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-3xl ${
              m.role === 'user'
                ? 'bg-emerald-500/20 text-white rounded-tr-sm'
                : 'bg-navy-800 border border-navy-700 text-slate-200 rounded-tl-sm'
            }`}>
              {m.content || <span className="text-slate-500 animate-pulse">▍</span>}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={16} className="text-blue-400" />
              </div>
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3 max-w-5xl mr-auto">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-emerald-400" />
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-5xl mx-auto bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-5 border-t border-navy-700 flex-shrink-0">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your portfolio, tenants, finances, real estate strategy…  (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500"
            style={{ minHeight: 48, maxHeight: 160 }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-600 text-center mt-2">Using {FREE_MODELS.find(m => m.id === model)?.label} via OpenRouter</p>
      </div>
    </div>
  );
}

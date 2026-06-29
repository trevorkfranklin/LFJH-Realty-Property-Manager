import { randomUUID } from 'node:crypto';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SECRET_KEY;

  try {
    const settingsRes = await fetch(`${SB_URL}/rest/v1/settings?key=eq.simplefin_url&select=value`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    if (!settingsRes.ok) throw new Error(`Supabase settings lookup failed: ${settingsRes.status} ${await settingsRes.text()}`);
    const settingsData = await settingsRes.json();
    if (!settingsData.length || !settingsData[0].value) {
      return res.json({ ok: true, message: 'No SimpleFIN URL configured.' });
    }
    const sfUrl = settingsData[0].value;

    const u = new URL(sfUrl);
    const auth = Buffer.from(`${u.username}:${u.password}`).toString('base64');
    const base = `${u.protocol}//${u.host}${u.pathname}`;

    const since = new Date();
    since.setDate(since.getDate() - 3);
    const startTs = Math.floor(since.getTime() / 1000);
    const sinceDate = since.toISOString().slice(0, 10);

    const sfRes = await fetch(`${base}/accounts?start-date=${startTs}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!sfRes.ok) throw new Error(`SimpleFIN API error: ${sfRes.status} ${await sfRes.text()}`);
    const sfData = await sfRes.json();

    const excludedIdsRes = await fetch(`${SB_URL}/rest/v1/settings?key=eq.simplefin_excluded_ids&select=value`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const excludedIdsData = excludedIdsRes.ok ? await excludedIdsRes.json() : [];
    let excludedIds = new Set();
    try { excludedIds = new Set(JSON.parse(excludedIdsData[0]?.value || '[]')); } catch {}

    const EXCLUDED_ACCOUNT_SUFFIXES = ['6663', '5100', '9533'];
    const chaseAccounts = (sfData.accounts || [])
      .filter(a => a.org?.name?.toLowerCase().includes('chase'))
      .filter(a => !EXCLUDED_ACCOUNT_SUFFIXES.some(suffix => (a.name || a.id || '').includes(suffix)))
      .filter(a => !excludedIds.has(a.id));

    const fetched = chaseAccounts.flatMap(acct =>
      (acct.transactions || []).map(tx => {
        const amount = parseFloat(tx.amount);
        return {
          id: randomUUID(),
          sf_tx_id: tx.id,
          date: new Date(tx.posted * 1000).toISOString().slice(0, 10),
          description: tx.description || tx.memo || 'Bank transaction',
          amount: Math.abs(amount),
          type: amount >= 0 ? 'Income' : 'Expense',
          category: null,
          property_id: null,
          owner_id: null,
          notes: `SimpleFIN — ${acct.name}`,
          splits: [],
          rent_periods: [],
          excluded: false,
          categorized: false,
        };
      })
    );

    if (!fetched.length) {
      return res.json({ ok: true, fetched: 0, inserted: 0, duplicates: 0 });
    }

    const existingRes = await fetch(
      `${SB_URL}/rest/v1/transactions?date=gte.${sinceDate}&select=sf_tx_id,date,amount`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (!existingRes.ok) throw new Error(`Supabase transactions lookup failed: ${existingRes.status} ${await existingRes.text()}`);
    const existing = await existingRes.json();
    const existingSfIds = new Set((existing || []).filter(t => t.sf_tx_id).map(t => t.sf_tx_id));
    const existingDAKeys = new Set((existing || []).map(t => `${t.date}|${Math.abs(Number(t.amount))}`));

    const fresh = fetched.filter(tx =>
      !existingSfIds.has(tx.sf_tx_id) &&
      !existingDAKeys.has(`${tx.date}|${tx.amount}`)
    );

    for (let i = 0; i < fresh.length; i += 100) {
      const batch = fresh.slice(i, i + 100);
      const insertRes = await fetch(`${SB_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(batch),
      });
      if (!insertRes.ok) throw new Error(`Supabase insert failed: ${insertRes.status} ${await insertRes.text()}`);
    }

    return res.json({
      ok: true,
      fetched: fetched.length,
      inserted: fresh.length,
      duplicates: fetched.length - fresh.length,
    });
  } catch (e) {
    console.error('SimpleFIN sync failed:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

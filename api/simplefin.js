export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { accessUrl, daysBack = 30 } = req.body || {};
  if (!accessUrl) return res.status(400).json({ error: 'accessUrl required' });

  try {
    const u    = new URL(accessUrl);
    const auth = Buffer.from(`${u.username}:${u.password}`).toString('base64');
    const base = `${u.protocol}//${u.host}${u.pathname}`;

    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const startTs = Math.floor(since.getTime() / 1000);

    const sfRes = await fetch(`${base}/accounts?start-date=${startTs}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!sfRes.ok) {
      const text = await sfRes.text().catch(() => '');
      return res.status(sfRes.status).json({ error: `SimpleFIN returned ${sfRes.status}: ${text}` });
    }

    const data = await sfRes.json();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

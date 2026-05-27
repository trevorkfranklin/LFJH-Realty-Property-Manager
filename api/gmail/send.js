export const config = { runtime: 'edge' };

const GMAIL_ACCOUNT = 'lt2drealty@gmail.com';

async function getValidToken() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(GMAIL_ACCOUNT)}&select=access_token,refresh_token,expires_at`,
    { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
  );
  const rows = await res.json();
  if (!rows.length) throw new Error('Gmail not connected');

  const token = rows[0];
  const isExpired = new Date(token.expires_at) <= new Date(Date.now() + 60_000);
  if (!isExpired) return token.access_token;

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const refreshed = await refreshRes.json();
  if (!refreshRes.ok) throw new Error(`Token refresh failed: ${refreshed.error}`);

  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await fetch(
    `${supabaseUrl}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(GMAIL_ACCOUNT)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: refreshed.access_token, expires_at: expiresAt }),
    }
  );
  return refreshed.access_token;
}

function buildRawEmail({ to, subject, body }) {
  const message = [
    `From: LFJH Realty <${GMAIL_ACCOUNT}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n');

  const bytes = new TextEncoder().encode(message);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const { to, subject, body } = await req.json();
  if (!to || !subject || !body) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const accessToken = await getValidToken();
    const raw = buildRawEmail({ to, subject, body });

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(err, { status: res.status });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

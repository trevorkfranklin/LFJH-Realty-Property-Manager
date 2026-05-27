export const config = { runtime: 'edge' };

const GMAIL_ACCOUNT = 'lt2drealty@gmail.com';

export default async function handler(req) {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(GMAIL_ACCOUNT)}&select=email,expires_at`,
    { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
  );
  const rows = await res.json();
  const connected = Array.isArray(rows) && rows.length > 0;

  return new Response(
    JSON.stringify({ connected, email: connected ? rows[0].email : null }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export const config = { runtime: 'edge' };

const GMAIL_ACCOUNT = 'lt2drealty@gmail.com';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  await fetch(
    `${supabaseUrl}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(GMAIL_ACCOUNT)}`,
    {
      method: 'DELETE',
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    }
  );

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

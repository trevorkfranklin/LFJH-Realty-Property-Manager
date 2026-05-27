export const config = { runtime: 'edge' };

const GMAIL_ACCOUNT = 'lt2drealty@gmail.com';

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const appUrl = process.env.APP_URL || 'https://lfjh-realty-property-manager.vercel.app';

  if (!code) {
    return Response.redirect(`${appUrl}/users?gmail=error`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${appUrl}/api/gmail/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/users?gmail=error`);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await fetch(`${supabaseUrl}/rest/v1/gmail_tokens`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      email: GMAIL_ACCOUNT,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    }),
  });

  return Response.redirect(`${appUrl}/users?gmail=connected`);
}

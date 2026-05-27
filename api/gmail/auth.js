export const config = { runtime: 'edge' };

export default function handler() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.APP_URL || 'https://lfjh-realty-property-manager.vercel.app';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/gmail/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
    login_hint: 'lt2drealty@gmail.com',
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

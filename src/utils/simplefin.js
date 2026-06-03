export async function fetchAccounts(accessUrl, daysBack = 30) {
  const res = await fetch('/api/simplefin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessUrl, daysBack }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Proxy error (${res.status})`);
  return data.accounts || [];
}

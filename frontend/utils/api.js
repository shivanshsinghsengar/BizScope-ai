// deploy: 2026-05-09-v3
// Always use the explicit backend URL — never fall back to window.location.origin
// because frontend (Vercel) and backend (Render) are on different domains.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL_FALLBACK ||
  'https://bizscope-ai-og.onrender.com';

export default API_URL;

export async function fetchJson(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  // Guard against HTML error pages (Vercel 404, Render cold-start, etc.)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server returned non-JSON response (status ${res.status}). Backend may be starting up — try again in 30 seconds.`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

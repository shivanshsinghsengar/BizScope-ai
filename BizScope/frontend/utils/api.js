const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchJson(input, init = {}) {
  const url = typeof input === 'string' && !input.startsWith('http') ? `${API_URL}${input}` : input;
  const headers = init.headers ? { ...init.headers } : {};

  if (init.body != null && !(init.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = (data && typeof data === 'object' && (data.error || data.message)) || text || response.statusText || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export { API_URL, fetchJson };
export default API_URL;

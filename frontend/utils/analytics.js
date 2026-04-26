import API_URL from './api';

const SESSION_KEY = 'bizscope_session_id';

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server';
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const sid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(SESSION_KEY, sid);
  return sid;
};

export const trackEvent = async (event, meta = {}) => {
  try {
    if (typeof window === 'undefined') return;
    await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        route: window.location.pathname,
        sessionId: getSessionId(),
        meta,
      }),
    });
  } catch (_) {
    // Silent by design; analytics should never block UX
  }
};

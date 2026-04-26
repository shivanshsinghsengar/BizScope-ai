// Lightweight analytics — logs events to console in dev, sends to backend in prod
export const trackEvent = (event, props = {}) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, props);
      return;
    }
    // Fire-and-forget — don't block UI
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props, ts: Date.now() }),
    }).catch(() => {});
  } catch (_) {}
};

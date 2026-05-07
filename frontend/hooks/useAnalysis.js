import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import API_URL from '../utils/api';

export default function useAnalysis() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    const refreshFromStream = (location) => {
      return new Promise((resolve) => {
        try {
          const url = `${API_URL}/api/analyze-stream?location=${encodeURIComponent(location)}`;
          const evtSource = new EventSource(url);
          const timeout = setTimeout(() => { evtSource.close(); resolve(null); }, 30000);

          evtSource.onmessage = (e) => {
            try {
              const payload = JSON.parse(e.data);
              if (payload.step === 'result') {
                clearTimeout(timeout);
                evtSource.close();
                resolve(payload.data);
              } else if (payload.step === 'error') {
                clearTimeout(timeout);
                evtSource.close();
                resolve(null);
              }
            } catch (_) {}
          };
          evtSource.onerror = () => {
            clearTimeout(timeout);
            evtSource.close();
            resolve(null);
          };
        } catch (_) {
          resolve(null);
        }
      });
    };

    const load = async () => {
      try {
        const raw = sessionStorage.getItem('analysisData');
        if (!raw) { router.push('/'); return; }
        const parsed = JSON.parse(raw);
        setData(parsed);

        // Only refresh if data is genuinely bad (mock/estimated only)
        // Do NOT refresh just because it's single-source — that causes flicker
        const isEstimated = !!parsed.estimatedData;
        const isMock = parsed.businesses?.some(b => b.isMock);

        if ((isEstimated || isMock) && parsed.location?.displayName) {
          const fresh = await refreshFromStream(parsed.location.displayName);

          // Only replace if fresh data is strictly better:
          // more businesses AND not estimated/mock
          if (
            fresh &&
            !fresh.error &&
            !fresh.estimatedData &&
            !fresh.businesses?.some(b => b.isMock) &&
            (fresh.businesses?.length || 0) >= (parsed.businesses?.length || 0)
          ) {
            sessionStorage.setItem('analysisData', JSON.stringify(fresh));
            setData(fresh);
          }
        }
      } catch {
        router.push('/');
      }
    };

    load();
    router.events.on('routeChangeComplete', load);
    return () => router.events.off('routeChangeComplete', load);
  }, [router]);

  return data;
}

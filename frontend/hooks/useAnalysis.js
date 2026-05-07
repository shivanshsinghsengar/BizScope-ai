import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import API_URL from '../utils/api';

export default function useAnalysis() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    // Refresh via SSE stream — gets real TomTom + OSM hybrid data
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

        // Background refresh with hybrid data if stale or single-source
        if (parsed.location?.displayName) {
          const sources = parsed.dataQuality?.sourceCounts
            ? Object.keys(parsed.dataQuality.sourceCounts)
            : [];
          const isSingleSource = sources.length === 1;
          const isEstimated = !!parsed.estimatedData;

          if (isSingleSource || isEstimated) {
            const fresh = await refreshFromStream(parsed.location.displayName);
            if (fresh && !fresh.error) {
              sessionStorage.setItem('analysisData', JSON.stringify(fresh));
              setData(fresh);
            }
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

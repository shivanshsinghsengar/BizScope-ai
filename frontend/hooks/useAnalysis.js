import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import API_URL from '../utils/api';

export default function useAnalysis() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    const refreshFromBackend = async (location) => {
      try {
        const res = await fetch(`${API_URL}/api/analyze-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location }),
        });
        const fresh = await res.json();
        if (!fresh.error) {
          sessionStorage.setItem('analysisData', JSON.stringify(fresh));
          setData(fresh);
        }
      } catch {
        // Ignore refresh failures and keep existing data
      }
    };

    const load = async () => {
      try {
        const raw = sessionStorage.getItem('analysisData');
        if (!raw) { router.push('/'); return; }
        const parsed = JSON.parse(raw);
        setData(parsed);
        if (parsed.location?.displayName) {
          await refreshFromBackend(parsed.location.displayName);
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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import API_URL from '../utils/api';

export default function useAnalysis() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);

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
        // Keep the current data if refresh fails
      }
    };

    const load = async () => {
      try {
        const raw = sessionStorage.getItem('analysisData');
        if (!raw) { router.push('/'); return; }
        const parsed = JSON.parse(raw);
        setData(parsed);
        setReady(true);
        if (parsed.location?.displayName) {
          await refreshFromBackend(parsed.location.displayName);
        }
      } catch {
        router.push('/');
      }
    };

    load();
  }, [router]);

  return data;
}

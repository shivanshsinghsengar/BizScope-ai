import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function useAnalysis() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => {
      try {
        const raw = sessionStorage.getItem('analysisData');
        if (!raw) { router.push('/'); return; }
        setData(JSON.parse(raw));
      } catch {
        router.push('/');
      }
    };

    // Load immediately on mount
    load();

    // Also reload if route finishes changing (handles client-side nav)
    router.events.on('routeChangeComplete', load);
    return () => router.events.off('routeChangeComplete', load);
  }, [router]);

  return data;
}

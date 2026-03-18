import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function useAnalysis() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('analysisData');
    if (!raw) { router.push('/'); return; }
    setData(JSON.parse(raw));
    setReady(true);
  }, []);

  return data;
}

import '../styles/globals.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

// ── Route progress bar ──
function RouteProgressBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const start = () => {
      setLoading(true);
      setWidth(10);
      intervalRef.current = setInterval(() => {
        setWidth(w => (w < 85 ? w + Math.random() * 8 : w));
      }, 200);
    };
    const done = () => {
      clearInterval(intervalRef.current);
      setWidth(100);
      setTimeout(() => { setLoading(false); setWidth(0); }, 350);
    };
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
      clearInterval(intervalRef.current);
    };
  }, [router]);

  if (!loading && width === 0) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, zIndex: 9999,
      height: '3px', width: `${width}%`,
      background: 'linear-gradient(90deg, #10b981, #ffffff, #ef4444)',
      transition: width === 100 ? 'width 0.15s ease' : 'width 0.2s ease',
      boxShadow: '0 0 10px rgba(16,185,129,0.7)',
      borderRadius: '0 2px 2px 0',
    }} />
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="index, follow" />
        </Head>
        <RouteProgressBar />
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export const getInitialProps = undefined;

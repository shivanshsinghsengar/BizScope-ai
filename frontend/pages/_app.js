import '../styles/globals.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

// Top loading bar shown during route transitions
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
      background: 'linear-gradient(90deg, #6366f1, #a78bfa, #ec4899)',
      transition: width === 100 ? 'width 0.15s ease' : 'width 0.2s ease',
      boxShadow: '0 0 10px rgba(99,102,241,0.6)',
      borderRadius: '0 2px 2px 0',
    }} />
  );
}

function PageTransition({ children }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [key, setKey] = useState(router.pathname);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleStart = () => setVisible(false);
    const handleDone = () => {
      setKey(router.pathname);
      timeoutRef.current = setTimeout(() => setVisible(true), 30);
    };
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
      clearTimeout(timeoutRef.current);
    };
  }, [router]);

  return (
    <div
      key={key}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.32s ease, transform 0.32s ease',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <RouteProgressBar />
        <PageTransition>
          <Component {...pageProps} />
        </PageTransition>
      </AuthProvider>
    </ThemeProvider>
  );
}

export const getInitialProps = undefined;

import '../styles/globals.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useTheme } from '../context/ThemeContext';

// ── Animated particle canvas background ──
function ParticleBackground() {
  const canvasRef = useRef(null);
  const { dark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    const W = () => canvas.width;
    const H = () => canvas.height;
    const COUNT = 55;
    const CONNECT_DIST = 130;
    const pc = dark ? '99,102,241' : '79,70,229';

    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2.5 + 0.5,
      o: Math.random() * 0.6 + 0.3,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W()) p.vx *= -1;
        if (p.y < 0 || p.y > H()) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pc},${p.o})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${pc},${(1 - d / CONNECT_DIST) * 0.25})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', setSize);
    };
  }, [mounted, dark]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 2, pointerEvents: 'none',
        mixBlendMode: dark ? 'screen' : 'multiply',
        opacity: dark ? 1 : 0.6,
      }}
    />
  );
}

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
      background: 'linear-gradient(90deg, #6366f1, #a78bfa, #ec4899)',
      transition: width === 100 ? 'width 0.15s ease' : 'width 0.2s ease',
      boxShadow: '0 0 10px rgba(99,102,241,0.6)',
      borderRadius: '0 2px 2px 0',
    }} />
  );
}

// ── Page transition wrapper ──
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
    <div key={key} style={{
      position: 'relative', zIndex: 1,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.32s ease, transform 0.32s ease',
      minHeight: '100vh',
    }}>
      {children}
    </div>
  );
}

// ── Root app ──
function AppInner({ Component, pageProps }) {
  return (
    <>
      <RouteProgressBar />
      <ParticleBackground />
      <PageTransition>
        <Component {...pageProps} />
      </PageTransition>
    </>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <AppInner Component={Component} pageProps={pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export const getInitialProps = undefined;

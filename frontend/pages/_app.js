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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const COUNT = Math.min(60, Math.floor((W * H) / 18000));
    const CONNECT_DIST = 140;

    // particle color based on theme
    const pc = dark ? 'rgba(99,102,241,' : 'rgba(79,70,229,';

    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      o: Math.random() * 0.5 + 0.2,
    }));

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // update + draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${pc}${p.o})`;
        ctx.fill();
      }

      // draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * (dark ? 0.18 : 0.1);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `${pc}${alpha})`;
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
      window.removeEventListener('resize', resize);
    };
  }, [dark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', width: '100%', height: '100%',
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

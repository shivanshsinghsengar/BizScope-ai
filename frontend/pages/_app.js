import '../styles/globals.css';
import Head from 'next/head';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Head><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}

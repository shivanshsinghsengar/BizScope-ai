/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  turbopack: {},
  env: {
    // Fallback backend URL for production — overridden by NEXT_PUBLIC_API_URL in Vercel env vars
    NEXT_PUBLIC_API_URL_FALLBACK: 'https://bizscope-ai-og.onrender.com',
  },
};

module.exports = nextConfig;

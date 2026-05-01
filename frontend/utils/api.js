// deploy: 2026-03-20-v2
const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
export default API_URL;

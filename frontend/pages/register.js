import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Register is now part of the unified auth page at /login
export default function Register() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, []);
  return null;
}

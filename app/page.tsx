'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Temporarily redirect directly to dashboard
    router.push('/dashboard');
  }, [router]);

  return null;
}


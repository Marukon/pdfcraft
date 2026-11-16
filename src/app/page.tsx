'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { defaultLocale } from '@/lib/i18n/config';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/' + defaultLocale + '/' + window.location.search + window.location.hash);
  }, [router]);

  return <main className="p-6"><Link href="/zh/">进入 PDFCraft</Link></main>;
}

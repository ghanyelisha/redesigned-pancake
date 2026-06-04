"use client";
/**
 * ChatWidgetWrapper — renders ChatWidget only on passenger-facing pages.
 * Must not appear on any /admin/* route.
 */
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load to avoid hydration issues with cookies
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false });

function Inner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Never show on admin pages
  if (pathname.startsWith('/admin')) return null;

  // Extract bookingId from URL if on payment or confirmation pages
  let bookingId: string | undefined;
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'payment' && segments[1]) bookingId = segments[1];
  if (segments[0] === 'confirmation' && segments[1]) bookingId = segments[1];

  return <ChatWidget bookingId={bookingId} />;
}

export default function ChatWidgetWrapper() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '../components/ui/ErrorFallback';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorFallback error={error} resetErrorBoundary={reset} />;
}

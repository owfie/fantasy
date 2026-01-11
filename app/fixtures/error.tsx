'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Fixtures page error:', error);
  }, [error]);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-4">Fixtures</h1>
      <div className="border border-red-300 bg-red-50 rounded p-4">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Something went wrong!</h2>
        <p className="text-red-600 mb-4">
          {error.message || 'Failed to load fixtures'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}


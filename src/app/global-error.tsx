'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50 font-sans">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Noe gikk kritisk galt!</h2>
          <p className="text-gray-600 mb-6">En uventet feil oppstod i applikasjonen.</p>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100 mb-6 max-w-sm w-full text-left overflow-auto">
            <p className="text-xs text-red-500 font-mono break-all">{error.message || 'Ukjent feil'}</p>
          </div>
          <button
            onClick={() => {
                // Clear local storage and caches which might cause issues
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(function(registrations) {
                            for(let registration of registrations) {
                                registration.unregister();
                            }
                        });
                    }
                } catch (e) {
                    console.error("Could not clear storage", e);
                }
                reset();
                window.location.reload();
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-colors"
          >
            Last inn på nytt
          </button>
        </div>
      </body>
    </html>
  );
}

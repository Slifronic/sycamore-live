'use client';

// Last resort, for an error in the root layout itself: it replaces the whole
// document, so it brings its own <html> and inline styles (the site's CSS may
// be what failed). Same promise and the same reference as error.tsx.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#eef0e6', color: '#1a3a2a', font: '16px/1.5 system-ui, sans-serif' }}>
        <main role="alert" style={{ width: 'min(100% - 32px, 520px)', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', margin: '0 0 12px' }}>SycaMore Live didn’t load</h1>
          <p style={{ margin: '0 0 20px', color: '#3f5247' }}>
            Hours that were already recorded are safe. Try again in a moment
            {error.digest ? (
              <>
                {' '}
                (reference <strong>{error.digest}</strong>)
              </>
            ) : null}
            .
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ font: 'inherit', fontWeight: 600, padding: '12px 22px', borderRadius: 999, border: 0, background: '#2f6b4f', color: '#fff', cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

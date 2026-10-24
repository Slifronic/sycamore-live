// Loading skeletons for the heavier routes (loading.tsx). Still parchment
// blocks in the shape of the page that's coming, with a slow sheen; reduced
// motion keeps them still. Screen readers hear one "Loading" line.

const Line = ({ w = '100%', h = 12 }: { w?: string | number; h?: number }) => <span className="skel" style={{ display: 'block', width: w, height: h }} />;

function Head({ action = true }: { action?: boolean }) {
  return (
    <div className="page-head">
      <div style={{ display: 'grid', gap: 10, width: '100%', maxWidth: 520 }}>
        <Line w={90} h={10} />
        <span className="skel skel-title" />
        <Line w="80%" />
      </div>
      {action && <span className="skel" style={{ width: 150, height: 52, borderRadius: 12 }} />}
    </div>
  );
}

function Rows({ n = 6 }: { n?: number }) {
  return (
    <div className="card" style={{ padding: '6px 0' }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) 90px', gap: 14, alignItems: 'center', padding: '12px 18px', borderTop: i ? '1px solid var(--rule-soft)' : 0 }}>
          <span className="skel" style={{ width: 48, height: 48, borderRadius: 10 }} />
          <span style={{ display: 'grid', gap: 8 }}>
            <Line w={`${60 - (i % 3) * 10}%`} h={14} />
            <Line w="40%" h={10} />
          </span>
          <span className="skel" style={{ height: 26, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ kind = 'list' }: { kind?: 'dashboard' | 'list' | 'event' | 'document' | 'cards' | 'verify' }) {
  return (
    <div className="page" aria-busy="true">
      <p className="sr-only" role="status">
        Loading…
      </p>
      <Head action={kind !== 'document'} />
      {kind === 'dashboard' && (
        <>
          <span className="skel" style={{ height: 140, borderRadius: 20 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <span className="skel" style={{ height: 180, borderRadius: 14 }} />
            <span className="skel" style={{ height: 180, borderRadius: 14 }} />
            <span className="skel" style={{ height: 180, borderRadius: 14 }} />
          </div>
          <Rows n={4} />
        </>
      )}
      {kind === 'list' && <Rows />}
      {kind === 'event' && (
        <>
          <span className="skel" style={{ height: 120, borderRadius: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
            <span className="skel" style={{ height: 380, borderRadius: 14 }} />
            <Rows n={5} />
          </div>
        </>
      )}
      {kind === 'verify' && (
        <>
          <span className="skel" style={{ height: 96, borderRadius: 14 }} />
          <Rows n={7} />
        </>
      )}
      {kind === 'document' && (
        <div className="card" style={{ padding: 32, display: 'grid', gap: 14, maxWidth: 900 }}>
          <Line w="45%" h={26} />
          <Line w="60%" />
          <span className="skel" style={{ height: 96, borderRadius: 14, marginTop: 8 }} />
          {Array.from({ length: 7 }, (_, i) => (
            <Line key={i} w={`${92 - (i % 4) * 9}%`} />
          ))}
        </div>
      )}
      {kind === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card" style={{ overflow: 'hidden', display: 'grid', gap: 10, paddingBottom: 18 }}>
              <span className="skel" style={{ aspectRatio: '2 / 1', borderRadius: 0 }} />
              <span style={{ display: 'grid', gap: 8, padding: '0 18px' }}>
                <Line w="70%" h={16} />
                <Line w="50%" />
                <Line w="85%" />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

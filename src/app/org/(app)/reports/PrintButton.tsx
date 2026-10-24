'use client';

export function PrintButton({ label = 'Save as PDF' }: { label?: string }) {
  return (
    <button className="btn btn-primary" onClick={() => window.print()}>
      {label}
    </button>
  );
}

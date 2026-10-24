'use client';

export function PrintButton({ label = 'Save as PDF', className = 'btn btn-primary' }: { label?: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {label}
    </button>
  );
}

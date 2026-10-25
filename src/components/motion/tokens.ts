// Motion values shared by every animated piece, mirroring the CSS tokens in
// globals.css (--dur-1/2/3, --ease-out, --ease-inout). Use SPRING for anything
// that slides between options (segmented pills, the rail's active pill).

export const DUR = { 1: 0.12, 2: 0.2, 3: 0.32 } as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_INOUT = [0.65, 0, 0.35, 1] as const;
export const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const;
export const INSTANT = { duration: 0 } as const;

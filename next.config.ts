import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== 'production';

// Content Security Policy. Inline scripts stay allowed because the theme script
// runs before paint and the pages are statically prerendered (no per-request
// nonce); everything else is pinned to the origins the app actually uses:
// Google Identity Services for walk-in sign-in, OpenStreetMap for maps.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.googleusercontent.com",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://accounts.google.com/gsi/${dev ? ' ws: http://localhost:*' : ''}`,
  "frame-src https://accounts.google.com/gsi/ https://www.openstreetmap.org",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
  "object-src 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The QR scanner needs the camera, voice notes the microphone, and the leave-the-area check location.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Dev only: lets a second checkout run on 127.0.0.1 so its sign-in cookie
  // doesn't collide with another dev server on localhost.
  allowedDevOrigins: ['127.0.0.1'],
  // Keep the dev badge off the sidebar and the verify bar.
  devIndicators: { position: 'bottom-right' },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: lets a second checkout run on 127.0.0.1 so its sign-in cookie
  // doesn't collide with another dev server on localhost.
  allowedDevOrigins: ['127.0.0.1'],
  // Keep the dev badge off the sidebar and the verify bar.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;

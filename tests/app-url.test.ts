// The one definition of the site's address, and the never-throwing variant the
// layout, robots.txt and the sitemap use while rendering.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appUrl, appUrlOr } from '../src/lib/app-url.ts';

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    saved[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('the variable wins, without a trailing slash', () => {
  withEnv({ NEXT_PUBLIC_APP_URL: 'https://sycamore.example/ ', NODE_ENV: 'production' }, () => {
    assert.equal(appUrl(), 'https://sycamore.example');
  });
});

test('on Vercel without the variable, the production domain is used', () => {
  withEnv({ NEXT_PUBLIC_APP_URL: undefined, NODE_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'sycamore-live.vercel.app' }, () => {
    assert.equal(appUrl(), 'https://sycamore-live.vercel.app');
  });
});

test('production with no address at all fails loudly, but appUrlOr falls back', () => {
  withEnv({ NEXT_PUBLIC_APP_URL: undefined, NODE_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: undefined }, () => {
    assert.throws(() => appUrl(), /NEXT_PUBLIC_APP_URL/);
    assert.equal(appUrlOr('http://localhost:3311'), 'http://localhost:3311');
  });
});

test('development uses the README port', () => {
  withEnv({ NEXT_PUBLIC_APP_URL: undefined, NODE_ENV: 'development' }, () => {
    assert.equal(appUrl(), 'http://localhost:3311');
  });
});

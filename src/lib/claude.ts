import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// The app's own credentials only. An ANTHROPIC_BASE_URL inherited from a
// developer tool would silently reroute requests, so the host is pinned
// unless SYCAMORE_ANTHROPIC_BASE_URL is set on purpose.
export const claudeEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export function claude() {
  return new Anthropic({ baseURL: process.env.SYCAMORE_ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com' });
}

export { Anthropic };

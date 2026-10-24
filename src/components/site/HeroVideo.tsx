import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { LoopVideo } from './LoopVideo';

// The hero's optional ambient loop. Rendered only if the assets agent produced
// /media/video/hero-loop.mp4; otherwise the still photo underneath is the hero.

export function HeroVideo() {
  const dir = join(process.cwd(), 'public', 'media', 'video');
  if (!existsSync(join(dir, 'hero-loop.mp4'))) return null;
  const poster = existsSync(join(dir, 'hero-loop.jpg')) ? '/media/video/hero-loop.jpg' : undefined;
  return <LoopVideo src="/media/video/hero-loop.mp4" poster={poster} />;
}

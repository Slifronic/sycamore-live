import 'server-only';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Event-story media (voice notes, videos, posters) lives on local disk for the
// weekend build. Files are never served from /public: every read goes through
// an /api/media route that checks who is asking. The turbopackIgnore comments
// keep the build from tracing the whole project into the server bundle.

const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), '.media');

const EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
};

export const baseMime = (type: string) => type.split(';')[0].trim().toLowerCase();
export const isAllowedMime = (type: string) => baseMime(type) in EXT;

// Stream an uploaded File to disk without holding it in memory; returns the stored file name.
export async function saveUpload(file: Blob): Promise<string> {
  const mime = baseMime(file.type);
  const ext = EXT[mime];
  if (!ext) throw new Error(`Unsupported media type ${file.type}`);
  await mkdir(MEDIA_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await pipeline(Readable.fromWeb(file.stream() as never), createWriteStream(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ MEDIA_DIR, name)));
  return name;
}

export async function removeMedia(name: string | null | undefined) {
  if (!name) return;
  await unlink(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ MEDIA_DIR, path.basename(name))).catch(() => {});
}

// Serve a stored file with HTTP range support, which Safari needs to play video.
export async function serveMedia(req: Request, name: string, mime: string): Promise<Response> {
  const file = path.join(/*turbopackIgnore: true*/ MEDIA_DIR, path.basename(name));
  let size: number;
  try {
    size = (await stat(/*turbopackIgnore: true*/ file)).size;
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const headers: Record<string, string> = {
    'Content-Type': baseMime(mime),
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, max-age=3600',
  };
  const range = req.headers.get('range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    end = Math.min(end, size - 1);
    start = Math.min(start, end);
    if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    const body = Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ file, { start, end })) as unknown as ReadableStream;
    return new Response(body, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }
  const body = Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ file)) as unknown as ReadableStream;
  return new Response(body, { headers: { ...headers, 'Content-Length': String(size) } });
}

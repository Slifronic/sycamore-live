import 'server-only';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { del, get, head, put } from '@vercel/blob';

// Event-story media (voice notes, videos, posters). Files are never served from
// /public: every read goes through an /api/media route that checks who is asking.
//
// Two stores, picked by the environment:
// - Vercel Blob, private, when BLOB_READ_WRITE_TOKEN is set (production). A
//   serverless function's disk is wiped between requests, so this is the only
//   store that keeps a file. The database keeps the blob's URL; the URL alone
//   opens nothing, because the store is private and reads need the token.
// - Local disk (.media, or MEDIA_DIR) otherwise, for development.
// Rows saved before the switch keep their bare file names and still read from disk.
//
// The turbopackIgnore comments keep the build from tracing the whole project into the server bundle.

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

/** Blob storage is on: uploads go to Vercel Blob, and big files go there straight from the browser. */
export const usesBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const isBlobUrl = (name: string) => name.startsWith('https://');

/** Where the browser uploads an event's media directly; the upload route only signs paths under it. */
export const eventMediaPrefix = (eventId: string) => `story/${eventId}/`;

/** The MIME types and size caps a direct upload may use, by what it is. */
export const DIRECT_KINDS = {
  video: { types: ['video/mp4', 'video/quicktime', 'video/webm'], max: 300 * 1024 * 1024 },
  audio: { types: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'], max: 50 * 1024 * 1024 },
} as const;
export type DirectKind = keyof typeof DIRECT_KINDS;

// Save an uploaded File; returns what the database stores (a blob URL or a file name).
export async function saveUpload(file: Blob, eventId?: string): Promise<string> {
  const mime = baseMime(file.type);
  const ext = EXT[mime];
  if (!ext) throw new Error(`Unsupported media type ${file.type}`);
  const name = `${randomUUID()}.${ext}`;
  if (usesBlob()) {
    const { url } = await put(`${eventId ? eventMediaPrefix(eventId) : 'story/'}${name}`, file, {
      access: 'private',
      contentType: mime,
      addRandomSuffix: false,
      multipart: file.size > 20 * 1024 * 1024,
    });
    return url;
  }
  // Stream to disk without holding the file in memory.
  await mkdir(MEDIA_DIR, { recursive: true });
  await pipeline(Readable.fromWeb(file.stream() as never), createWriteStream(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ MEDIA_DIR, name)));
  return name;
}

/**
 * Accepts a file the browser already uploaded to Blob (see the story upload route): it must sit
 * under this event's prefix in our own store, and be a type and size this kind allows. `head`
 * only succeeds for a blob in the store our token opens, so a URL from anywhere else fails here.
 */
export async function adoptDirectUpload(url: unknown, eventId: string, kind: DirectKind): Promise<{ url: string; mime: string; size: number } | null> {
  if (!usesBlob() || typeof url !== 'string' || !isBlobUrl(url)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.hostname.endsWith('.blob.vercel-storage.com') || !parsed.pathname.startsWith(`/${eventMediaPrefix(eventId)}`)) return null;
  const meta = await head(url).catch(() => null);
  if (!meta) return null;
  const mime = baseMime(meta.contentType);
  const rule = DIRECT_KINDS[kind];
  if (!(rule.types as readonly string[]).includes(mime) || meta.size > rule.max) {
    await del(url).catch(() => {});
    return null;
  }
  return { url: meta.url, mime, size: meta.size };
}

export async function removeMedia(name: string | null | undefined) {
  if (!name) return;
  if (isBlobUrl(name)) {
    await del(name).catch((e) => console.error('[media] blob delete failed', e));
    return;
  }
  await unlink(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ MEDIA_DIR, path.basename(name))).catch(() => {});
}

const baseHeaders = (mime: string): Record<string, string> => ({
  'Content-Type': baseMime(mime),
  'Accept-Ranges': 'bytes',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, max-age=3600',
});

// Serve a stored file with HTTP range support, which Safari needs to play video.
export async function serveMedia(req: Request, name: string, mime: string): Promise<Response> {
  const range = req.headers.get('range');
  if (isBlobUrl(name)) return serveBlob(name, mime, range);

  const file = path.join(/*turbopackIgnore: true*/ MEDIA_DIR, path.basename(name));
  let size: number;
  try {
    size = (await stat(/*turbopackIgnore: true*/ file)).size;
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const headers = baseHeaders(mime);
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

// Private blobs stream through this function, so the store's URL and token never reach the browser.
// The Range header is passed on; Blob answers 206 with its own Content-Range.
async function serveBlob(url: string, mime: string, range: string | null): Promise<Response> {
  const validRange = range && /^bytes=\d*-\d*$/.test(range.trim()) ? range.trim() : null;
  let res;
  try {
    res = await get(url, { access: 'private', headers: validRange ? { range: validRange } : undefined });
  } catch (e) {
    // A range past the end comes back as 416 from the store, which the SDK reports as an error.
    if (validRange && String(e).includes('416')) return new Response(null, { status: 416 });
    console.error('[media] blob read failed', e);
    return new Response('Not available', { status: 502 });
  }
  if (!res || res.statusCode !== 200) return new Response('Not found', { status: 404 });
  const headers = baseHeaders(mime);
  const contentRange = res.headers.get('content-range');
  const length = res.headers.get('content-length');
  if (length) headers['Content-Length'] = length;
  if (contentRange) headers['Content-Range'] = contentRange;
  return new Response(res.stream, { status: contentRange ? 206 : 200, headers });
}

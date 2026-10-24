// A picked place, and the links built from it. Safe to import on the client.

export type Place = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  url: string | null; // the maps link the coordinator pasted, if any
};

type Where = { name?: string | null; address?: string | null; lat?: number | null; lng?: number | null; text?: string | null };

const hasPin = (w: Where): w is Where & { lat: number; lng: number } => w.lat != null && w.lng != null;

/** One line for calendars and messages: "Guadalupe River Park, 438 Coleman Ave, San José, CA". */
export function placeLine(w: Where): string | null {
  if (w.name && w.address && !w.address.startsWith(w.name)) return `${w.name}, ${w.address}`;
  return w.address || w.name || w.text || null;
}

/** Directions in Google Maps: opens the app on phones, the website elsewhere. */
export function googleDirections(w: Where): string | null {
  if (hasPin(w)) return `https://www.google.com/maps/dir/?api=1&destination=${w.lat},${w.lng}`;
  const line = placeLine(w);
  return line ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(line)}` : null;
}

/** Directions in Apple Maps. */
export function appleDirections(w: Where): string | null {
  const q = w.name ?? placeLine(w);
  if (hasPin(w)) return `https://maps.apple.com/?daddr=${w.lat},${w.lng}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const line = placeLine(w);
  return line ? `https://maps.apple.com/?daddr=${encodeURIComponent(line)}` : null;
}

/** An OpenStreetMap embed centred on the pin, for an <iframe>. No key, no tracking cookies. */
export function mapEmbed(lat: number, lng: number, zoomSpan = 0.006): string {
  const bbox = [lng - zoomSpan * 1.6, lat - zoomSpan, lng + zoomSpan * 1.6, lat + zoomSpan].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=17/${lat.toFixed(5)}/${lng.toFixed(5)}`;

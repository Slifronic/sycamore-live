import 'server-only';
import QRCode from 'qrcode';
import { googleClientId } from './google';
import { walkinCount, walkinState, walkinWindow, type WalkinState } from './walkin';
import type { EventRow } from './types';

// What the coordinator's event page needs to show the walk-in QR.
export type WalkinPanel = {
  state: WalkinState;
  url: string | null;
  qrSvg: string | null;
  opens: string;
  closes: string;
  count: number;
  google: boolean;
};

export function walkinUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/w/${token}`;
}

export async function walkinPanel(event: EventRow): Promise<WalkinPanel> {
  const { opens, closes } = walkinWindow(event);
  const url = event.walkin_token ? walkinUrl(event.walkin_token) : null;
  return {
    state: walkinState(event),
    url,
    qrSvg: url ? await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#10281d', light: '#ffffff' } }) : null,
    opens: opens.toISOString(),
    closes: closes.toISOString(),
    count: await walkinCount(event.id),
    google: !!googleClientId(),
  };
}

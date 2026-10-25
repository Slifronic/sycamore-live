import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { MotionRoot } from '@/components/motion/MotionRoot';

const display = Fraunces({ variable: '--font-display', subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'] });
const sans = Plus_Jakarta_Sans({ variable: '--font-sans', subsets: ['latin'] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3311';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'SycaMore Live', template: '%s · SycaMore Live' },
  description: 'Volunteer hours recorded as the event happens, verified by the organization. Every volunteer gets a record a school or scholarship committee can check.',
  applicationName: 'SycaMore Live',
  openGraph: { siteName: 'SycaMore Live', type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#f7f6f1',
  colorScheme: 'light',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <MotionRoot>{children}</MotionRoot>
      </body>
    </html>
  );
}

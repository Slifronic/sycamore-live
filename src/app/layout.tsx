import type { Metadata, Viewport } from 'next';
import { Fraunces, Lexend, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import './palettes.css';
import { MotionRoot } from '@/components/motion/MotionRoot';
import { Toaster } from '@/components/shell/Toast';
import { ThemeScript } from '@/components/shell/ThemeScript';

const display = Fraunces({ variable: '--font-display', subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'] });
const sans = Plus_Jakarta_Sans({ variable: '--font-sans', subsets: ['latin'] });
// The marketing site's voice: Lexend, light at display sizes (--font-site).
const site = Lexend({ variable: '--font-site', subsets: ['latin'], weight: ['200', '300', '400', '500'] });

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
  themeColor: '#eef0e6',
  colorScheme: 'light',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme is set by the script before React hydrates, so it differs from the server HTML on purpose.
    <html lang="en" className={`${display.variable} ${sans.variable} ${site.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <MotionRoot>{children}</MotionRoot>
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { MotionRoot } from '@/components/motion/MotionRoot';
import { Toaster } from '@/components/shell/Toast';
import { THEME_KEY } from '@/components/shell/theme';

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f6f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1712' },
  ],
  colorScheme: 'light dark',
};

// Runs before first paint: the stored choice, else the system setting, so a
// dark-mode visitor never sees a flash of parchment. Kept tiny and inline.
const NO_FLASH = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme is set by the script before React hydrates, so it differs from the server HTML on purpose.
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>
        <MotionRoot>{children}</MotionRoot>
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { MotionRoot } from '@/components/motion/MotionRoot';

const display = Fraunces({ variable: '--font-display', subsets: ['latin'], weight: ['500', '600'] });
const sans = Plus_Jakarta_Sans({ variable: '--font-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SycaMore Live',
  description: 'Volunteer hours recorded as the event happens, verified by the organization.',
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

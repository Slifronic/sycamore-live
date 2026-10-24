import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/SiteShell';

// The public marketing pages: one header, one footer, same as the landing page.

export const metadata: Metadata = {
  title: { template: '%s · SycaMore Live', default: 'SycaMore Live' },
};

export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return <SiteShell>{children}</SiteShell>;
}

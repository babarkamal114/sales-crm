import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { AppProviders } from '@/components/layouts/app-providers';
import '@/styles/globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  weight: 'variable',
  display: 'optional',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: 'CRM',
    template: '%s · CRM',
  },
  description: 'Lead management CRM for sales teams.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-GB"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-ink-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

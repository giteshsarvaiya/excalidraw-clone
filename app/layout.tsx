import type { Metadata } from 'next';
import { Nunito, Caveat } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Sketchroom — Collaborative Drawing',
  description: 'Real-time collaborative whiteboard with a hand-drawn feel.',
  openGraph: {
    title: 'Sketchroom — Collaborative Drawing',
    description: 'Real-time collaborative whiteboard with a hand-drawn feel.',
    images: [{ url: '/og.webp', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og.webp'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppHeader } from '@/components/navigation/AppHeader';
import { AppBottomNav } from '@/components/navigation/AppBottomNav';

export const metadata: Metadata = {
  title: 'Waypoint Autopilot — Outdoor Pedestrian Exploration',
  description: 'A mobile-first, eyes-up pedestrian waypoint navigation application for urban and park discovery.',
  applicationName: 'Waypoint Autopilot',
  authors: [{ name: 'Waypoint Engineering' }],
  keywords: ['pedestrian navigation', 'open-street-map', 'waypoints', 'walking exploration', 'privacy-first'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen flex flex-col antialiased selection:bg-primary/20 selection:text-primary-light">
        <AppHeader />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4 pb-24 sm:pb-20">
          {children}
        </main>
        <AppBottomNav />
      </body>
    </html>
  );
}

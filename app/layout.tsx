import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RoomStyle Studio | AI Tile Visualizer Demo',
  description:
    'A hardware, tile, and curtain retail demo with room upload, floor and wall visualizer, tile comparison, instant quote, and sales assistant.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

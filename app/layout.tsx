import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://roomstyle-studio-demo.anshitabhasin.chatgpt.site'),
  title: 'RoomStyle | AI Room Visualizer',
  description:
    'Visualize floors and walls in your room, get AI product recommendations, compare options, and receive an instant project quote.',
  openGraph: {
    title: 'RoomStyle | AI Room Visualizer',
    description: 'See the right surfaces in your room and move from inspiration to an exact quote.',
    images: ['/room-luxury.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RoomStyle | AI Room Visualizer',
    description: 'See the right surfaces in your room and move from inspiration to an exact quote.',
    images: ['/room-luxury.png'],
  },
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

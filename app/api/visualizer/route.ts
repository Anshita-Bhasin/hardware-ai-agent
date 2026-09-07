import { NextResponse } from 'next/server';
import { createQuote } from '@/lib/catalog';
import { createRoomvoPayload, VisualizerState } from '@/lib/roomvo-agent';

export async function POST(request: Request) {
  const state = (await request.json()) as VisualizerState;

  return NextResponse.json({
    quote: createQuote(state),
    roomvo: createRoomvoPayload(state),
  });
}

import { NextResponse } from 'next/server';
import { answerFromAgent, createRoomvoPayload, VisualizerState } from '@/lib/roomvo-agent';

export async function POST(request: Request) {
  const state = (await request.json()) as VisualizerState;

  return NextResponse.json({
    reply: answerFromAgent(state),
    roomvo: createRoomvoPayload(state),
  });
}

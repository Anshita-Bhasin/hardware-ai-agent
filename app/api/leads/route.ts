import { NextResponse } from 'next/server';
import { findProduct } from '@/lib/catalog';

type LeadRequest = {
  name?: string;
  phone?: string;
  email?: string;
  timeline?: string;
  floorProductId?: string;
  wallProductId?: string;
  area?: number;
  wastage?: number;
  total?: number;
};

export async function POST(request: Request) {
  const lead = (await request.json()) as LeadRequest;
  if (!lead.name?.trim() || !lead.phone?.trim()) {
    return NextResponse.json({ error: 'Name and mobile number are required.' }, { status: 400 });
  }

  const floor = findProduct(lead.floorProductId || '', 'floors');
  const wall = findProduct(lead.wallProductId || '', 'walls');
  const leadId = `RS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const summary = [
    `RoomStyle enquiry ${leadId}`,
    `Customer: ${lead.name.trim()}`,
    `Floor: ${floor.title} (${floor.code})`,
    `Walls: ${wall.title} (${wall.code})`,
    `Room: ${lead.area || 0} m² with ${lead.wastage || 0}% wastage`,
    `Estimate: QAR ${Math.round(lead.total || 0).toLocaleString()}`,
    `Timeline: ${lead.timeline || 'Not specified'}`,
  ].join('\n');

  return NextResponse.json({
    leadId,
    accepted: true,
    whatsappHref: `https://wa.me/?text=${encodeURIComponent(summary)}`,
  });
}

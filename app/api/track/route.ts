import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    const body = await req.json();
    const { auditId, metric, value } = body || {};
    await prisma.event.create({
      data: {
        userId,
        type: metric,
        meta: { auditId, value },
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return new NextResponse('Invalid body', { status: 400 });
  }
}
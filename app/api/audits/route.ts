import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const take = 10;
  const where = { userId };
  const audits = await prisma.audit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });
  const nextCursor = audits.length === take ? audits[audits.length - 1].id : null;
  return NextResponse.json({ items: audits, nextCursor });
}
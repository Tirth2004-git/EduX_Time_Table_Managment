import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  const { error, user } = await authenticateRequest(req);
  if (error) return error;

  return NextResponse.json({ user }, { status: 200 });
}


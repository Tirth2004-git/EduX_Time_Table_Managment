import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from './auth';

export async function authenticateRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      ),
      user: null,
    };
  }

  const payload = verifyToken(token);

  if (!payload) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      ),
      user: null,
    };
  }

  return {
    error: null,
    user: payload,
  };
}


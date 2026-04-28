import { loginOrRegister, logout, getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth — get current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

// POST /api/auth — login or register
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, email, displayName } = body;

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  const userId = await loginOrRegister({ walletAddress, email, displayName });
  return NextResponse.json({ userId });
}

// DELETE /api/auth — logout
export async function DELETE() {
  await logout();
  return NextResponse.json({ success: true });
}

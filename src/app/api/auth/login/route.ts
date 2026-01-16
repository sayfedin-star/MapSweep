
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { key } = await request.json();

  if (key === process.env.ADMIN_KEY) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid Access Key' }, { status: 401 });
}

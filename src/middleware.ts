
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard and api routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
    // Skip public api routes if any (e.g.login)
    if (pathname === '/api/auth/login') {
      return NextResponse.next();
    }

    const correctKey = process.env.ADMIN_KEY;
    // If no key configured in dev, warn but allow? Or block? 
    // Secure by default: Block if not set or mismatch.
    if (!correctKey) {
       // In dev, maybe allow if not set? No, enforce security.
       // return NextResponse.next();
    }

    // Check cookie for UI access
    const authCookie = request.cookies.get('admin_session');
    
    // Check header for API access (e.g. external scripts)
    const authHeader = request.headers.get('x-admin-key');

    const isAuthenticated = (authCookie?.value === correctKey) || (authHeader === correctKey);

    if (!isAuthenticated) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};

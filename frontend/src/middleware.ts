import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next();

  // We rely on client-side auth redirect for most routes (the store persists to sessionStorage).
  // This middleware is a lightweight gate for server-rendered access.
  // Full protection is in client layout components.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};
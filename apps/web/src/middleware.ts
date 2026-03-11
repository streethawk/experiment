import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/family',        // family portal has its own auth
  '/api/',
];

// Routes that require manager role
const MANAGER_ONLY_PATHS = [
  '/staff',
  '/finance',
  '/compliance',
  '/rota',
  '/settings',
  '/reports',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for access token in cookie (set by auth flow)
  // We use a short-lived httpOnly cookie to indicate auth — the actual
  // access token is stored in localStorage and sent via Authorization header.
  // The cookie only gates routing — API calls validate the real JWT.
  const authCookie = request.cookies.get('cc_auth_indicator');

  if (!authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role claim from cookie for manager-only routes
  const roleCookie = request.cookies.get('cc_role');
  const role = roleCookie?.value;

  const MANAGER_ROLES = ['home_manager', 'registered_manager', 'group_admin', 'platform_admin'];

  if (MANAGER_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (!role || !MANAGER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, robots.txt
     * - Public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|icons|images).*)',
  ],
};

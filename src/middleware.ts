import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

const ADMIN_ROUTES = ['/admin-dashboard', '/claims-management', '/escalation-queue', '/policy-manager', '/audit-log'];
const CLAIMANT_ROUTES = ['/claimant-dashboard', '/file-claim', '/claim-status'];
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth'];

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  const role = user.user_metadata?.role || user.app_metadata?.role || 'claimant';
  const isAdmin = role === 'admin';
  const isClaimant = role === 'claimant';

  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  const isClaimantRoute = CLAIMANT_ROUTES.some(r => pathname.startsWith(r));

  if (isAdminRoute && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = '/claimant-dashboard';
    return NextResponse.redirect(url);
  }

  if (isClaimantRoute && !isClaimant) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin-dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

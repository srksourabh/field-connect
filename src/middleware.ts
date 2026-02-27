import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Supabase auth token in cookies
  const allCookies = request.cookies.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
  const authCookie0 = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token.0")
  );

  const cookieValue = authCookie?.value || authCookie0?.value;

  /** Helper to clear all auth cookies and redirect to login */
  function clearAndRedirect() {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (authCookie?.name) response.cookies.delete(authCookie.name);
    if (authCookie0?.name) response.cookies.delete(authCookie0.name);
    return response;
  }

  /** Parse JWT payload without verification (for expiry check only).
   *  Auth is still validated client-side by Supabase SDK on each API call. */
  function parseJwtExpiry(token: string): number | null {
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;
      const decoded = JSON.parse(atob(payload));
      return decoded.exp ?? null;
    } catch {
      return null;
    }
  }

  if (!cookieValue && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Validate the token locally on dashboard routes (no network call — avoids SPOF)
  if (cookieValue && pathname.startsWith("/dashboard")) {
    try {
      const decoded = decodeURIComponent(cookieValue);
      const session = JSON.parse(
        decoded.startsWith("base64-") ? atob(decoded.slice(7)) : atob(decoded)
      );
      if (session?.access_token) {
        // Check JWT expiry locally — if expired, redirect to login
        const exp = parseJwtExpiry(session.access_token);
        if (exp && exp < Math.floor(Date.now() / 1000)) {
          return clearAndRedirect();
        }
        // Token exists and is not expired — allow through
      } else {
        return clearAndRedirect();
      }
    } catch {
      // Cookie parse failed — redirect to login
      return clearAndRedirect();
    }
  }

  // Redirect authenticated users away from login
  if (cookieValue && pathname === "/login") {
    try {
      const decoded = decodeURIComponent(cookieValue);
      const session = JSON.parse(
        decoded.startsWith("base64-") ? atob(decoded.slice(7)) : atob(decoded)
      );
      if (session?.access_token) {
        const exp = parseJwtExpiry(session.access_token);
        if (exp && exp > Math.floor(Date.now() / 1000)) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    } catch { /* stale cookie — fall through to login page */ }
    // Token invalid or expired — clear stale cookie and show login
    const response = NextResponse.next();
    if (authCookie?.name) response.cookies.delete(authCookie.name);
    if (authCookie0?.name) response.cookies.delete(authCookie0.name);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

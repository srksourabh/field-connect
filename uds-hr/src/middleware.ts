import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  if (!cookieValue && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Validate the token with Supabase on dashboard routes
  if (cookieValue && pathname.startsWith("/dashboard")) {
    try {
      const decoded = decodeURIComponent(cookieValue);
      const session = JSON.parse(
        decoded.startsWith("base64-") ? atob(decoded.slice(7)) : atob(decoded)
      );
      if (session?.access_token) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { error } = await supabase.auth.getUser(session.access_token);
        if (error) {
          // Invalid/expired token — clear cookie and redirect
          const response = NextResponse.redirect(new URL("/login", request.url));
          response.cookies.delete(authCookie?.name || "");
          return response;
        }
      } else {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } catch {
      // Cookie parse failed — redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from login — but validate first
  // to prevent redirect loops from stale cookies
  if (cookieValue && pathname === "/login") {
    try {
      const decoded = decodeURIComponent(cookieValue);
      const session = JSON.parse(
        decoded.startsWith("base64-") ? atob(decoded.slice(7)) : atob(decoded)
      );
      if (session?.access_token) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { error } = await supabase.auth.getUser(session.access_token);
        if (!error) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    } catch { /* stale cookie — fall through to login page */ }
    // Token invalid or parse failed — clear stale cookie and show login
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

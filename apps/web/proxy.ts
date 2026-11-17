import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send visitors without a session cookie to sign in.
// The API verifies the signed cookie on every request; an expired session
// is caught there (401) and the client redirects to /login.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("paywise_session")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Not /api (proxied to the API, which does its own check), assets, or /login.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

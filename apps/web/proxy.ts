import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.cookies.has("paywise_session")) {
    const login = new URL("/login", request.url);

    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);

    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

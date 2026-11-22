import { NextResponse, type NextRequest } from "next/server";
import { COOKIES } from "./utils/constants/others/cookies";
import { OPEN_PATHS, PATH } from "./utils/constants/others/paths";

function isSignedIn(request: NextRequest) {
  const token = request.cookies.get(COOKIES.AUTH_TOKEN)?.value;
  if (!token) return false;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return !!payload.exp && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const open = OPEN_PATHS.includes(pathname);
  const signedIn = isSignedIn(request);

  if (!signedIn && !open) {
    const login = new URL(PATH.LOGIN, request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (signedIn && pathname === PATH.LOGIN) {
    return NextResponse.redirect(new URL(PATH.OVERVIEW, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};

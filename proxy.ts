import { NextResponse, type NextRequest } from "next/server";
import { findUserById } from "@/lib/server/db";
import { SESSION_COOKIE, verifySession } from "@/lib/server/session";

// Protege toda la aplicación: sin sesión válida se redirige al inicio de sesión.
// Cada ruta de API vuelve a validar la sesión contra la base (defensa en profundidad).

const PUBLIC = ["/login", "/api/auth/login", "/api/auth/status"];
const MUST_CHANGE_ALLOWED = ["/cambiar-clave", "/api/auth/change-password", "/api/auth/logout", "/api/auth/me"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  // La sesión debe seguir vigente en la base: usuario activo y misma versión de sesión.
  const valid = claims ? await findUserById(claims.sub).then((u) => !!u && u.active && u.session_version === claims.ver).catch(() => false) : false;

  if (!claims || !valid) {
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  if (claims!.mcp && !MUST_CHANGE_ALLOWED.includes(pathname)) {
    if (isApi) return NextResponse.json({ error: "must_change_password" }, { status: 403 });
    return NextResponse.redirect(new URL("/cambiar-clave", req.url));
  }
  if (pathname.startsWith("/usuarios") && claims!.role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};

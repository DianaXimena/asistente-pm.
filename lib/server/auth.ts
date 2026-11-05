import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureSchema, findUserById, type DbUser } from "./db";
import { SESSION_COOKIE, SESSION_HOURS, verifySession, type SessionClaims } from "./session";

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) missing.push("AUTH_SECRET");
  return missing;
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_HOURS * 3600,
};

/** Usuario de la sesión actual validado contra la base (activo y misma versión de sesión). */
export async function currentUser(): Promise<{ user: DbUser; claims: SessionClaims } | null> {
  if (missingConfig().length) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return null;
  await ensureSchema();
  const user = await findUserById(claims.sub);
  if (!user || !user.active || user.session_version !== claims.ver) return null;
  return { user, claims };
}

/** Para rutas de API: devuelve el usuario o una respuesta 401/403/503. */
export async function requireUser(opts: { admin?: boolean; allowMustChange?: boolean } = {}) {
  if (missingConfig().length) return { error: NextResponse.json({ error: "auth_not_configured" }, { status: 503 }) };
  const cu = await currentUser();
  if (!cu) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (cu.user.must_change_password && !opts.allowMustChange) return { error: NextResponse.json({ error: "must_change_password" }, { status: 403 }) };
  if (opts.admin && cu.user.role !== "admin") return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user: cu.user };
}

/** Política de claves: mínimo 10 caracteres con letras, números y un símbolo. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "La clave debe tener al menos 10 caracteres.";
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]/.test(pw))
    return "La clave debe combinar letras, números y al menos un símbolo.";
  if (process.env.INITIAL_PASSWORD && pw === process.env.INITIAL_PASSWORD) return "No puedes reutilizar la clave inicial.";
  return null;
}

export const publicUser = (u: DbUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  must_change_password: u.must_change_password,
  active: u.active,
  created_at: u.created_at,
  last_login_at: u.last_login_at,
});

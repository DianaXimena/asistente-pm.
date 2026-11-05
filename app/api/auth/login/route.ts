import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookieOptions, missingConfig } from "@/lib/server/auth";
import { audit, ensureSchema, findUserByEmail, sql } from "@/lib/server/db";
import { SESSION_COOKIE, signSession } from "@/lib/server/session";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// Hash ficticio para comparar en tiempo constante cuando el usuario no existe.
let dummyHash: string | null = null;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash("cuenta-inexistente", 12));

export async function POST(req: Request) {
  if (missingConfig().length) return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  let email = "";
  let password = "";
  try {
    const b = (await req.json()) as { email?: unknown; password?: unknown };
    email = typeof b.email === "string" ? b.email.trim().toLowerCase().slice(0, 200) : "";
    password = typeof b.password === "string" ? b.password.slice(0, 200) : "";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!email || !password) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  await ensureSchema();
  const user = await findUserByEmail(email);
  const ok = await bcrypt.compare(password, user?.password_hash ?? (await getDummyHash()));

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    await audit(email, "login_bloqueado", "Cuenta bloqueada temporalmente");
    return NextResponse.json({ error: "locked", minutes: LOCK_MINUTES }, { status: 423 });
  }
  if (!user || !user.active || !ok) {
    if (user) {
      const attempts = user.failed_attempts + 1;
      const lock = attempts >= MAX_ATTEMPTS;
      await sql()`UPDATE app_users SET failed_attempts = ${lock ? 0 : attempts},
        locked_until = ${lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null} WHERE id = ${user.id}`;
      await audit(email, lock ? "cuenta_bloqueada" : "login_fallido", lock ? `${MAX_ATTEMPTS} intentos fallidos` : `Intento ${attempts}`);
    } else {
      await audit(email, "login_fallido", "Usuario inexistente");
    }
    // Mismo mensaje en todos los casos: no revela si el correo existe.
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await sql()`UPDATE app_users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = ${user.id}`;
  await audit(email, "login_exitoso");
  const token = await signSession({ sub: user.id, email: user.email, role: user.role, mcp: user.must_change_password, ver: user.session_version });
  const res = NextResponse.json({ ok: true, mustChange: user.must_change_password });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}

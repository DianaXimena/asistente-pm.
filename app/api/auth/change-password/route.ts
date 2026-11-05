import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookieOptions, passwordProblem, requireUser } from "@/lib/server/auth";
import { audit, sql } from "@/lib/server/db";
import { SESSION_COOKIE, signSession } from "@/lib/server/session";

export async function POST(req: Request) {
  const r = await requireUser({ allowMustChange: true });
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { current?: unknown; next?: unknown };
  const current = typeof b.current === "string" ? b.current : "";
  const next = typeof b.next === "string" ? b.next.slice(0, 200) : "";
  if (!(await bcrypt.compare(current, r.user.password_hash))) return NextResponse.json({ error: "La clave actual no es correcta." }, { status: 400 });
  const problem = passwordProblem(next) ?? (next === current ? "La nueva clave debe ser distinta de la actual." : null);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const hash = await bcrypt.hash(next, 12);
  const ver = r.user.session_version + 1;
  await sql()`UPDATE app_users SET password_hash = ${hash}, must_change_password = false, session_version = ${ver} WHERE id = ${r.user.id}`;
  await audit(r.user.email, "clave_cambiada");
  // Nueva sesión (las demás sesiones abiertas quedan invalidadas).
  const token = await signSession({ sub: r.user.id, email: r.user.email, role: r.user.role, mcp: false, ver });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}

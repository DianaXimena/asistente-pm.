import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { passwordProblem, publicUser, requireUser } from "@/lib/server/auth";
import { audit, sql, type DbUser } from "@/lib/server/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const r = await requireUser({ admin: true });
  if ("error" in r) return r.error;
  const rows = (await sql()`SELECT * FROM app_users ORDER BY created_at`) as DbUser[];
  return NextResponse.json(rows.map(publicUser));
}

/** Crea un usuario con clave temporal (deberá cambiarla al primer ingreso). */
export async function POST(req: Request) {
  const r = await requireUser({ admin: true });
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { email?: unknown; name?: unknown; role?: unknown; password?: unknown };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase().slice(0, 200) : "";
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
  const role = b.role === "admin" ? "admin" : "pm";
  const password = typeof b.password === "string" ? b.password.slice(0, 200) : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
  if (password.length < 10) return NextResponse.json({ error: "La clave temporal debe tener al menos 10 caracteres." }, { status: 400 });
  const problem = passwordProblem(password);
  if (problem && !problem.includes("clave inicial")) return NextResponse.json({ error: problem }, { status: 400 });
  const exists = (await sql()`SELECT 1 FROM app_users WHERE email = ${email}`) as unknown[];
  if (exists.length) return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
  const hash = await bcrypt.hash(password, 12);
  const rows = (await sql()`INSERT INTO app_users (email, name, password_hash, role, must_change_password)
    VALUES (${email}, ${name || email.split("@")[0]}, ${hash}, ${role}, true) RETURNING *`) as DbUser[];
  await audit(email, "usuario_creado", `Por ${r.user.email} · rol ${role}`);
  return NextResponse.json(publicUser(rows[0]), { status: 201 });
}

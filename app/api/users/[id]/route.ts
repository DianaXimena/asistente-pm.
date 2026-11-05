import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { passwordProblem, publicUser, requireUser } from "@/lib/server/auth";
import { audit, findUserById, sql, type DbUser } from "@/lib/server/db";

/** Activar/desactivar, cambiar rol o restablecer la clave (temporal) de un usuario. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await requireUser({ admin: true });
  if ("error" in r) return r.error;
  const { id } = await params;
  const target = await findUserById(id).catch(() => null);
  if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { active?: unknown; role?: unknown; password?: unknown };
  const self = target.id === r.user.id;

  if (typeof b.active === "boolean") {
    if (self && !b.active) return NextResponse.json({ error: "No puedes desactivar tu propio usuario." }, { status: 400 });
    await sql()`UPDATE app_users SET active = ${b.active}, session_version = session_version + 1 WHERE id = ${id}`;
    await audit(target.email, b.active ? "usuario_activado" : "usuario_desactivado", `Por ${r.user.email}`);
  }
  if (b.role === "admin" || b.role === "pm") {
    if (self && b.role !== "admin") return NextResponse.json({ error: "No puedes quitarte el rol de administrador." }, { status: 400 });
    await sql()`UPDATE app_users SET role = ${b.role}, session_version = session_version + 1 WHERE id = ${id}`;
    await audit(target.email, "rol_cambiado", `${b.role} · por ${r.user.email}`);
  }
  if (typeof b.password === "string") {
    const problem = b.password.length < 10 ? "La clave temporal debe tener al menos 10 caracteres." : passwordProblem(b.password);
    if (problem && !problem.includes("clave inicial")) return NextResponse.json({ error: problem }, { status: 400 });
    const hash = await bcrypt.hash(b.password, 12);
    await sql()`UPDATE app_users SET password_hash = ${hash}, must_change_password = true, failed_attempts = 0,
      locked_until = NULL, session_version = session_version + 1 WHERE id = ${id}`;
    await audit(target.email, "clave_restablecida", `Por ${r.user.email}`);
  }
  const rows = (await sql()`SELECT * FROM app_users WHERE id = ${id}`) as DbUser[];
  return NextResponse.json(publicUser(rows[0]));
}

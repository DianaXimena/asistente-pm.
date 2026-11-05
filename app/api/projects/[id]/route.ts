import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { MAX_PROJECT_BYTES, canAccess, getProjectRow, insertAudit, newAuditEntries, serverAudit, stripAudit } from "@/lib/server/projects";
import type { Project } from "@/lib/types";

/**
 * Crea (version 0) o actualiza un proyecto con concurrencia optimista.
 * Rechaza cambios sobre entradas ya registradas en la bitácora.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { id } = await params;
  const text = await req.text();
  if (text.length > MAX_PROJECT_BYTES) return NextResponse.json({ error: "Proyecto demasiado grande." }, { status: 413 });
  let body: { data?: Project; version?: number };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const data = body.data;
  if (!data || data.project_id !== id || typeof body.version !== "number") return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const row = await getProjectRow(id);
  if (!row) {
    if (body.version !== 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const check = newAuditEntries([], data.audit_log);
    if ("error" in check) return NextResponse.json({ error: check.error }, { status: 422 });
    await sql()`INSERT INTO projects (id, owner_id, data) VALUES (${id}, ${r.user.id}, ${JSON.stringify(stripAudit(data))}::jsonb)`;
    await insertAudit(id, r.user.email, check.entries);
    return NextResponse.json({ version: 1, owner_email: r.user.email }, { status: 201 });
  }
  if (row.deleted_at) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccess(r.user, row.owner_id)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const stored = await serverAudit(id);
  const check = newAuditEntries(stored, data.audit_log);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: 422 });

  const updated = (await sql()`UPDATE projects SET data = ${JSON.stringify(stripAudit(data))}::jsonb, version = version + 1, updated_at = now()
    WHERE id = ${id} AND version = ${body.version} RETURNING version`) as { version: number }[];
  if (!updated.length) {
    const current = await getProjectRow(id);
    return NextResponse.json(
      { error: "conflict", version: current?.version, data: current ? { ...current.data, audit_log: await serverAudit(id) } : null },
      { status: 409 },
    );
  }
  await insertAudit(id, r.user.email, check.entries);
  return NextResponse.json({ version: updated[0].version });
}

/** Baja lógica: el proyecto deja de mostrarse, pero su bitácora se conserva. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { id } = await params;
  const row = await getProjectRow(id);
  if (!row || row.deleted_at) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccess(r.user, row.owner_id)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await sql()`UPDATE projects SET deleted_at = now() WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

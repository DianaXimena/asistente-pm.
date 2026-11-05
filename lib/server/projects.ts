import "server-only";
import { verifyAuditChain } from "@/lib/audit";
import type { AuditEntry, Project } from "@/lib/types";
import { sql, type DbUser } from "./db";

export const MAX_PROJECT_BYTES = 2_000_000;

interface ProjectRow {
  id: string;
  owner_id: string;
  owner_email: string;
  data: Project;
  version: number;
  updated_at: string;
}

interface AuditRow {
  seq: number;
  at: string;
  action: string;
  entity: string;
  entity_id: string;
  detail: string;
  hash: string;
}

const toEntry = (r: AuditRow): AuditEntry => ({
  seq: r.seq,
  at: new Date(r.at).toISOString(),
  action: r.action,
  entity: r.entity,
  entity_id: r.entity_id,
  detail: r.detail,
  hash: r.hash,
});

/** Bitácora oficial (la del servidor). */
export async function serverAudit(projectId: string): Promise<AuditEntry[]> {
  const rows = (await sql()`SELECT seq, at, action, entity, entity_id, detail, hash FROM project_audit WHERE project_id = ${projectId} ORDER BY seq`) as AuditRow[];
  return rows.map(toEntry);
}

export const canAccess = (u: DbUser, ownerId: string) => u.role === "admin" || u.id === ownerId;

/** Proyectos visibles: los propios; el administrador ve todos. */
export async function listProjects(u: DbUser) {
  const rows = (u.role === "admin"
    ? await sql()`SELECT p.id, p.owner_id, a.email AS owner_email, p.data, p.version, p.updated_at
        FROM projects p JOIN app_users a ON a.id = p.owner_id WHERE p.deleted_at IS NULL ORDER BY p.created_at`
    : await sql()`SELECT p.id, p.owner_id, a.email AS owner_email, p.data, p.version, p.updated_at
        FROM projects p JOIN app_users a ON a.id = p.owner_id WHERE p.deleted_at IS NULL AND p.owner_id = ${u.id} ORDER BY p.created_at`) as ProjectRow[];
  return Promise.all(
    rows.map(async (r) => ({ data: { ...r.data, audit_log: await serverAudit(r.id) }, version: r.version, owner_email: r.owner_email, updated_at: r.updated_at })),
  );
}

export async function getProjectRow(id: string) {
  const rows = (await sql()`SELECT p.id, p.owner_id, a.email AS owner_email, p.data, p.version, p.updated_at, p.deleted_at
    FROM projects p JOIN app_users a ON a.id = p.owner_id WHERE p.id = ${id}`) as (ProjectRow & { deleted_at: string | null })[];
  return rows[0] ?? null;
}

/**
 * La bitácora recibida debe conservar intactas todas las entradas ya registradas
 * (mismo número y huella) y su cadena debe ser válida. Devuelve las entradas nuevas.
 */
export function newAuditEntries(stored: AuditEntry[], incoming: AuditEntry[]): { error: string } | { entries: AuditEntry[] } {
  if (!Array.isArray(incoming)) return { error: "Bitácora ausente." };
  if (incoming.length < stored.length) return { error: "La bitácora no puede perder entradas." };
  for (let i = 0; i < stored.length; i++) {
    if (incoming[i]?.seq !== stored[i].seq || incoming[i]?.hash !== stored[i].hash) return { error: `La entrada #${stored[i].seq} de la bitácora fue modificada.` };
  }
  if (!verifyAuditChain(incoming).ok) return { error: "La cadena de integridad de la bitácora no es válida." };
  return { entries: incoming.slice(stored.length) };
}

export async function insertAudit(projectId: string, actor: string, entries: AuditEntry[]) {
  for (const e of entries) {
    await sql()`INSERT INTO project_audit (project_id, seq, at, actor_email, action, entity, entity_id, detail, hash)
      VALUES (${projectId}, ${e.seq}, ${e.at}, ${actor}, ${e.action}, ${e.entity}, ${e.entity_id}, ${e.detail}, ${e.hash})
      ON CONFLICT (project_id, seq) DO NOTHING`;
  }
}

/** El JSON guardado no duplica la bitácora: su fuente oficial es project_audit. */
export const stripAudit = (p: Project) => ({ ...p, audit_log: [] as AuditEntry[] });

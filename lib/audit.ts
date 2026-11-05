import type { AuditEntry, Project } from "./types";

// Hallazgo 2 · Integridad de datos: marcas de tiempo del sistema, bitácora solo-agregar
// encadenada y prevención de aprobaciones retroactivas.

/** Huella no criptográfica de 53 bits (cyrb53). Detecta alteraciones; no reemplaza una firma en servidor. */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

const payload = (e: Omit<AuditEntry, "hash">, prev: string) => [prev, e.seq, e.at, e.action, e.entity, e.entity_id, e.detail].join("|");

/** Agrega una entrada sellada con la hora del sistema. Nunca modifica las anteriores. */
export function appendAudit(p: Project, action: string, entity: string, entityId: string, detail = ""): Project {
  const log = p.audit_log ?? [];
  const prev = log[log.length - 1];
  const base = { seq: (prev?.seq ?? 0) + 1, at: new Date().toISOString(), action, entity, entity_id: entityId, detail };
  const entry: AuditEntry = Object.freeze({ ...base, hash: cyrb53(payload(base, prev?.hash ?? "GENESIS")) });
  return { ...p, audit_log: [...log, entry] };
}

/** Verifica la cadena: cualquier edición, borrado o reordenamiento rompe las huellas. */
export function verifyAuditChain(log: AuditEntry[]): { ok: boolean; brokenAt: number | null } {
  let prev = "GENESIS";
  for (let i = 0; i < log.length; i++) {
    const { hash, ...base } = log[i];
    if (base.seq !== i + 1 || cyrb53(payload(base, prev)) !== hash) return { ok: false, brokenAt: base.seq ?? i + 1 };
    prev = hash;
  }
  return { ok: true, brokenAt: null };
}

/** Última aprobación registrada de una entidad. */
export const lastAudit = (p: Project, entity: string, entityId?: string) =>
  [...(p.audit_log ?? [])].reverse().find((e) => e.entity === entity && (!entityId || e.entity_id === entityId));

/* ---------------- Prevención de aprobación retroactiva ---------------- */

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const isoDate = (iso: string) => {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Una fecha de aprobación, verificación o aceptación no puede ser futura ni anterior
 * al evento que la habilita. Devuelve el mensaje de error o null.
 */
export function approvalDateError(date: string, earliest?: { date: string; label: string }): string | null {
  if (!date) return null;
  if (date > todayIso()) return "La fecha no puede ser futura: solo se registra lo que ya ocurrió.";
  if (earliest?.date && date < isoDate(earliest.date))
    return `Aprobación retroactiva no permitida: la fecha no puede ser anterior a ${earliest.label} (${isoDate(earliest.date)}).`.replace(" a el ", " al ");
  return null;
}

import type { PhaseId, Project } from "./types";

export interface DriveUploadResult {
  ok: boolean;
  /** not_configured: la app no tiene Apps Script configurado (se continúa sin Drive). */
  error?: string;
  folders?: { client: string; project: string; phase: string };
  files?: { ok: boolean; nombre: string; url?: string; error?: string }[];
}

export const DRIVE_ERRORS: Record<string, string> = {
  not_configured: "Google Drive no está configurado en el servidor.",
  too_large: "Los archivos superan el máximo de 3 MB por envío.",
  drive_unreachable: "No se pudo contactar a Google Drive.",
  unauthorized: "El token de Google Apps Script no coincide.",
};

/**
 * Crea (o reutiliza) la carpeta Cliente / Proyecto / Fase en Google Drive y guarda allí los archivos.
 * Sin archivos, solo prepara la ruta.
 */
export async function uploadToPhase(project: Pick<Project, "client_name" | "project_name" | "phases">, phaseId: PhaseId, files: File[] = []): Promise<DriveUploadResult> {
  const phase = project.phases.find((p) => p.id === phaseId)?.phase_name ?? "Iniciación";
  const form = new FormData();
  form.set("client", project.client_name);
  form.set("project", project.project_name);
  form.set("phase", phase);
  files.forEach((f) => form.append("files", f));
  try {
    const res = await fetch("/api/drive/files", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as DriveUploadResult & { error?: string };
    if (!res.ok && res.status !== 207) return { ok: false, error: data.error ?? "drive_error" };
    return { ...data, ok: !!data.ok };
  } catch {
    return { ok: false, error: "drive_unreachable" };
  }
}

/** Fase a la que pertenece un insumo (por su cuestionario). */
export const phaseOfInput = (project: Project, questionnaire: string): PhaseId =>
  project.phases.find((p) => p.mandatory_inputs.some((i) => i.questionnaire === questionnaire))?.id ?? project.current_phase;

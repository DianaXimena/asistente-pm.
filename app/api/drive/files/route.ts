import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { audit } from "@/lib/server/db";
import { initialPhases } from "@/lib/project-factory";

/** Límite de Vercel para el cuerpo de una petición (~4.5 MB); se deja margen para la codificación. */
const MAX_TOTAL_BYTES = 3_000_000;
const PHASES = initialPhases().map((p) => p.phase_name);
const clean = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 150) : "");

/**
 * Crea (o reutiliza) en Google Drive la ruta Cliente / Proyecto / Fase y guarda allí los
 * archivos recibidos. Sin archivos, solo prepara la ruta (registro del proyecto).
 */
export async function POST(req: Request) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const client = clean(form.get("client"));
  const project = clean(form.get("project"));
  const phase = clean(form.get("phase"));
  if (!client || !project || !PHASES.includes(phase)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const uploads = form.getAll("files").filter((f): f is File => f instanceof File);
  const total = uploads.reduce((a, f) => a + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return NextResponse.json({ error: "too_large", max_mb: MAX_TOTAL_BYTES / 1_000_000 }, { status: 413 });
  const files = await Promise.all(
    uploads.map(async (f) => ({ nombre: f.name.slice(0, 200), mimeType: f.type || "application/octet-stream", contenidoBase64: Buffer.from(await f.arrayBuffer()).toString("base64") })),
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, action: "organizeFiles", client, project, phase, files }),
      redirect: "follow",
      cache: "no-store",
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string | null;
      carpetas?: Record<"cliente" | "proyecto" | "fase", { url: string; creada: boolean }>;
      archivos?: { ok: boolean; nombre: string; url?: string; error?: string }[];
    };
    if (!data.carpetas) return NextResponse.json({ error: data.error ?? "drive_error" }, { status: 502 });
    const saved = (data.archivos ?? []).filter((a) => a.ok);
    if (saved.length) await audit(r.user.email, "documentos_guardados_drive", `${client} / ${project} / ${phase}: ${saved.map((a) => a.nombre).join(", ")}`);
    return NextResponse.json(
      { ok: !!data.ok, error: data.error ?? null, folders: { client: data.carpetas.cliente.url, project: data.carpetas.proyecto.url, phase: data.carpetas.fase.url }, files: data.archivos ?? [] },
      { status: data.ok ? 200 : 207 },
    );
  } catch {
    return NextResponse.json({ error: "drive_unreachable" }, { status: 502 });
  }
}

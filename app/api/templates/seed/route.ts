import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { audit, ensureSchema, sql } from "@/lib/server/db";
import { PHASE_SHORT, STATIC_HEADER, getTemplate, templateDocName } from "@/lib/templates";

/**
 * Carga inicial (una sola vez por plantilla): crea el documento maestro en la carpeta
 * madre de Google Drive mediante Apps Script y registra su URL en la base de datos.
 * Si la plantilla ya está registrada, no hace nada y devuelve el enlace existente.
 */
export async function POST(req: Request) {
  const r = await requireUser({ admin: true });
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => ({}))) as { templateId?: unknown };
  const template = typeof body.templateId === "string" ? getTemplate(body.templateId) : undefined;
  if (!template) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await ensureSchema();
  const existing = (await sql()`SELECT url FROM template_documents WHERE template_id = ${template.id}`) as { url: string }[];
  if (existing.length) return NextResponse.json({ url: existing[0].url, already: true });

  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const payload = {
    token,
    action: "seedTemplate",
    docName: templateDocName(template),
    title: template.name,
    ...STATIC_HEADER,
    typesLabel: `Tipo: ${template.types.join(" / ")}`,
    phasesLabel: `Grupo de procesos: ${template.phases.map((p) => PHASE_SHORT[p]).join(" · ")}`,
    purpose: template.purpose,
    sections: template.sections,
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; id?: string; url?: string; reused?: boolean };
    if (!data.ok || !data.url || !data.id) return NextResponse.json({ error: data.error ?? "drive_error" }, { status: 502 });
    await sql()`INSERT INTO template_documents (template_id, doc_id, url, created_by)
      VALUES (${template.id}, ${data.id}, ${data.url}, ${r.user.email}) ON CONFLICT (template_id) DO NOTHING`;
    await audit(r.user.email, "plantilla_inicializada", `${template.name}${data.reused ? " (ya existía en Drive)" : ""}`);
    return NextResponse.json({ url: data.url, already: false, reused: !!data.reused });
  } catch {
    return NextResponse.json({ error: "drive_unreachable" }, { status: 502 });
  }
}

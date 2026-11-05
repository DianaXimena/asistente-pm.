import { NextResponse } from "next/server";
import { PHASE_SHORT, folderTypeFor, getTemplate } from "@/lib/templates";
import type { ApproachType } from "@/lib/types";

const APPROACHES: ApproachType[] = ["Predictivo", "Agil", "Hibrido"];
const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

/**
 * Genera (o reutiliza) la plantilla en Google Drive a través del Web App de Apps Script.
 * La estructura del documento sale del catálogo del servidor, nunca del navegador.
 */
export async function POST(req: Request) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const template = getTemplate(clean(body.templateId, 60));
  const client = clean(body.client);
  const project = clean(body.project);
  const date = clean(body.date, 40);
  const approach = APPROACHES.includes(body.approach as ApproachType) ? (body.approach as ApproachType) : null;
  if (!template || client.length < 2 || project.length < 2 || !date) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const payload = {
    token,
    folderType: folderTypeFor(template, approach),
    docName: `${template.name} — ${project} (${client})`,
    title: template.name,
    client,
    project,
    date,
    typesLabel: `Tipo: ${template.types.join(" / ")}`,
    phasesLabel: `Grupo de procesos: ${template.phases.map((p) => PHASE_SHORT[p]).join(" · ")}`,
    purpose: template.purpose,
    sections: template.sections,
  };

  try {
    // Apps Script responde con una redirección: se sigue y se lee el JSON final.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; id?: string; url?: string; folder?: string; reused?: boolean };
    if (!data.ok || !data.url || !data.id) return NextResponse.json({ error: data.error ?? "drive_error" }, { status: 502 });
    return NextResponse.json({ id: data.id, url: data.url, folder: data.folder ?? payload.folderType, reused: !!data.reused });
  } catch {
    return NextResponse.json({ error: "drive_unreachable" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { ensureSchema, sql } from "@/lib/server/db";

/** Enlaces de las plantillas estándar (lectura para todos los usuarios con sesión). */
export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  await ensureSchema();
  const rows = (await sql()`SELECT template_id, doc_id, url, created_at FROM template_documents`) as { template_id: string; doc_id: string; url: string; created_at: string }[];
  return NextResponse.json({
    docs: Object.fromEntries(rows.map((x) => [x.template_id, { url: x.url, doc_id: x.doc_id, created_at: x.created_at }])),
    canSeed: r.user.role === "admin",
    driveConfigured: !!process.env.GOOGLE_APPS_SCRIPT_URL && !!process.env.GOOGLE_APPS_SCRIPT_TOKEN,
  });
}

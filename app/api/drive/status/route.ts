import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";

/** Indica si la integración con Google Drive está configurada (sin exponer valores). */
export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  return NextResponse.json({ configured: !!process.env.GOOGLE_APPS_SCRIPT_URL && !!process.env.GOOGLE_APPS_SCRIPT_TOKEN });
}

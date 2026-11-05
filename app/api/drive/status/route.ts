import { NextResponse } from "next/server";

/** Indica si la integración con Google Drive está configurada (sin exponer valores). */
export function GET() {
  return NextResponse.json({ configured: !!process.env.GOOGLE_APPS_SCRIPT_URL && !!process.env.GOOGLE_APPS_SCRIPT_TOKEN });
}

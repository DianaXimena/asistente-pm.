import { NextResponse } from "next/server";
import { missingConfig } from "@/lib/server/auth";

/** Qué variables faltan para activar el acceso (solo nombres, nunca valores). */
export function GET() {
  const missing = missingConfig();
  return NextResponse.json({ configured: missing.length === 0, missing });
}

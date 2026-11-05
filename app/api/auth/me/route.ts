import { NextResponse } from "next/server";
import { publicUser, requireUser } from "@/lib/server/auth";

export async function GET() {
  const r = await requireUser({ allowMustChange: true });
  if ("error" in r) return r.error;
  return NextResponse.json(publicUser(r.user));
}

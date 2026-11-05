import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { listProjects } from "@/lib/server/projects";

export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const projects = await listProjects(r.user);
  return NextResponse.json({ me: { id: r.user.id, email: r.user.email, role: r.user.role }, projects });
}

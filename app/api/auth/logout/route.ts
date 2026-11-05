import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { audit } from "@/lib/server/db";
import { SESSION_COOKIE } from "@/lib/server/session";

export async function POST() {
  const cu = await currentUser().catch(() => null);
  if (cu) await audit(cu.user.email, "logout").catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

import { SignJWT, jwtVerify } from "jose";

// Sesión firmada (HS256) en cookie httpOnly. Sin dependencias de base de datos
// para poder verificarse también en proxy.ts.

export const SESSION_COOKIE = "apm_session";
export const SESSION_HOURS = 8;

export interface SessionClaims {
  sub: string;
  email: string;
  role: "admin" | "pm";
  /** Debe cambiar la clave antes de usar la app. */
  mcp: boolean;
  /** Versión de sesión: al desactivar o restablecer la clave se invalidan las sesiones. */
  ver: number;
}

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

export async function signSession(c: SessionClaims): Promise<string> {
  return new SignJWT({ email: c.email, role: c.role, mcp: c.mcp, ver: c.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(c.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return null;
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role === "admin" ? "admin" : "pm",
      mcp: !!payload.mcp,
      ver: Number(payload.ver ?? 0),
    };
  } catch {
    return null;
  }
}

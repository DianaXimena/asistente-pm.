import "server-only";
import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

// Conexión a Neon (Postgres) y esquema de autenticación.

// Solo para pruebas locales: permite apuntar el driver a un Postgres propio vía HTTP.
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;

let client: NeonQueryFunction<false, false> | null = null;
export function sql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  return (client ??= neon(url));
}

let ready: Promise<void> | null = null;

/** Crea las tablas si no existen y siembra los usuarios iniciales (solo si no hay ninguno). */
export function ensureSchema(): Promise<void> {
  return (ready ??= init().catch((e) => {
    ready = null;
    throw e;
  }));
}

async function init() {
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE CHECK (email = lower(email)),
    name text NOT NULL DEFAULT '',
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'pm' CHECK (role IN ('admin', 'pm')),
    must_change_password boolean NOT NULL DEFAULT true,
    active boolean NOT NULL DEFAULT true,
    session_version integer NOT NULL DEFAULT 1,
    failed_attempts integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
  )`;
  // Bitácora de accesos: solo se agregan filas.
  await q`CREATE TABLE IF NOT EXISTS auth_audit (
    id bigserial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    email text NOT NULL,
    event text NOT NULL,
    detail text NOT NULL DEFAULT ''
  )`;
  await q`CREATE OR REPLACE FUNCTION auth_audit_append_only() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'auth_audit es de solo inserción'; END; $$ LANGUAGE plpgsql`;
  await q`DROP TRIGGER IF EXISTS auth_audit_no_change ON auth_audit`;
  await q`CREATE TRIGGER auth_audit_no_change BEFORE UPDATE OR DELETE ON auth_audit FOR EACH ROW EXECUTE FUNCTION auth_audit_append_only()`;
  // Proyectos: documento JSON por proyecto con dueño y versión (concurrencia optimista).
  await q`CREATE TABLE IF NOT EXISTS projects (
    id text PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES app_users(id),
    data jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`;
  // Bitácora de auditoría del proyecto en el servidor: solo inserción.
  await q`CREATE TABLE IF NOT EXISTS project_audit (
    project_id text NOT NULL REFERENCES projects(id),
    seq integer NOT NULL,
    at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    actor_email text NOT NULL,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text NOT NULL,
    detail text NOT NULL DEFAULT '',
    hash text NOT NULL,
    PRIMARY KEY (project_id, seq)
  )`;
  await q`CREATE OR REPLACE FUNCTION project_audit_append_only() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'project_audit es de solo inserción'; END; $$ LANGUAGE plpgsql`;
  await q`DROP TRIGGER IF EXISTS project_audit_no_change ON project_audit`;
  await q`CREATE TRIGGER project_audit_no_change BEFORE UPDATE OR DELETE ON project_audit FOR EACH ROW EXECUTE FUNCTION project_audit_append_only()`;
  await seedInitialUsers();
}

/**
 * Usuarios iniciales desde variables de entorno (INITIAL_USERS e INITIAL_PASSWORD).
 * Solo se ejecuta con la tabla vacía; todos deben cambiar la clave al primer ingreso.
 */
async function seedInitialUsers() {
  const q = sql();
  const [{ count }] = (await q`SELECT count(*)::int AS count FROM app_users`) as { count: number }[];
  const emails = (process.env.INITIAL_USERS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const password = process.env.INITIAL_PASSWORD ?? "";
  if (count > 0 || emails.length === 0 || !password) return;
  const hash = await bcrypt.hash(password, 12);
  for (const email of emails) {
    await q`INSERT INTO app_users (email, name, password_hash, role, must_change_password)
            VALUES (${email}, ${email.split("@")[0]}, ${hash}, 'admin', true) ON CONFLICT (email) DO NOTHING`;
    await audit(email, "usuario_creado", "Usuario inicial (administrador)");
  }
}

export async function audit(email: string, event: string, detail = "") {
  await sql()`INSERT INTO auth_audit (email, event, detail) VALUES (${email}, ${event}, ${detail})`;
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: "admin" | "pm";
  must_change_password: boolean;
  active: boolean;
  session_version: number;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  last_login_at: string | null;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const rows = (await sql()`SELECT * FROM app_users WHERE email = ${email.trim().toLowerCase()}`) as DbUser[];
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const rows = (await sql()`SELECT * FROM app_users WHERE id = ${id}`) as DbUser[];
  return rows[0] ?? null;
}

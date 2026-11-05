"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Copy, KeyRound, Plus, RefreshCw, UserCheck, UserX, Wand2 } from "lucide-react";
import { Field, inputClass } from "../acta/fields";
import { btnPrimary, btnSecondary, card } from "../ui";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "admin" | "pm";
  must_change_password: boolean;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

/** Clave temporal aleatoria (letras, números y símbolos) generada en el navegador. */
function tempPassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*?-_"];
  const all = sets.join("");
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((s) => s[rnd(s.length)]);
  while (chars.length < 14) chars.push(all[rnd(all.length)]);
  return chars.sort(() => rnd(3) - 1).join("");
}

export function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ email: "", name: "", role: "pm" as "pm" | "admin", password: "" });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    else setError("No tienes permisos para administrar usuarios.");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, body: Record<string, unknown>, ok: string) => {
    setError("");
    setNotice("");
    const res = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(data.error ?? "No se pudo actualizar el usuario.");
    else {
      setNotice(ok);
      load();
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline">
        <ArrowLeft className="h-4 w-4" /> Portafolio
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Administración</p>
          <h1 className="mt-1 text-2xl font-semibold text-kruger-dark sm:text-3xl">Usuarios</h1>
          <p className="mt-1 text-sm text-kruger-dark/65">Cada usuario nuevo recibe una clave temporal y debe cambiarla en su primer ingreso.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      {open && (
        <form
          noValidate
          className={clsx(card, "animate-expand origin-top space-y-4")}
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setNotice("");
            const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) return setError(data.error ?? "No se pudo crear el usuario.");
            setNotice(`Usuario ${form.email} creado. Compártele la clave temporal por un canal seguro.`);
            setForm({ email: "", name: "", role: "pm", password: "" });
            setOpen(false);
            load();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo" htmlFor="u-email">
              <input id="u-email" type="email" autoFocus className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Nombre" htmlFor="u-name">
              <input id="u-name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Rol" htmlFor="u-role">
              <select id="u-role" className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "pm" | "admin" })}>
                <option value="pm">Project Manager</option>
                <option value="admin">Administrador</option>
              </select>
            </Field>
            <Field label="Clave temporal" htmlFor="u-pass" hint="Mínimo 10 caracteres con letras, números y un símbolo.">
              <div className="flex gap-2">
                <input id="u-pass" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" className={btnSecondary} title="Generar clave segura" onClick={() => setForm({ ...form, password: tempPassword() })}>
                  <Wand2 className="h-4 w-4" />
                </button>
                <button type="button" className={btnSecondary} title="Copiar" disabled={!form.password} onClick={() => navigator.clipboard.writeText(form.password).catch(() => {})}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              Crear usuario
            </button>
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-xl bg-semaforo-rojo/5 px-4 py-3 text-sm text-semaforo-rojo">{error}</p>}
      {notice && <p className="rounded-xl bg-semaforo-verde/10 px-4 py-3 text-sm text-kruger-dark">{notice}</p>}

      <section className={card}>
        {!users ? (
          <p className="text-sm text-kruger-dark/60">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-kruger-dark/55">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Usuario</th>
                  <th className="py-2 pr-3 font-semibold">Rol</th>
                  <th className="py-2 pr-3 font-semibold">Estado</th>
                  <th className="py-2 pr-3 font-semibold">Último ingreso</th>
                  <th className="py-2 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kruger-gray/20">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-kruger-dark">{u.email}</p>
                      <p className="text-xs text-kruger-dark/55">{u.name}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        aria-label={`Rol de ${u.email}`}
                        className="rounded-lg border border-kruger-gray/40 bg-white px-2 py-1 text-xs"
                        value={u.role}
                        onChange={(e) => patch(u.id, { role: e.target.value }, `Rol de ${u.email} actualizado.`)}
                      >
                        <option value="pm">Project Manager</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      <span className={clsx("rounded-full px-2 py-0.5 font-semibold", u.active ? "bg-semaforo-verde/10 text-semaforo-verde" : "bg-kruger-gray-soft text-kruger-dark/60")}>
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                      {u.must_change_password && <span className="ml-1 text-kruger-dark/55">· clave temporal</span>}
                    </td>
                    <td className="py-3 pr-3 text-xs text-kruger-dark/65">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("es-EC") : "—"}</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-kruger-gray/40 px-2 py-1 text-xs hover:border-kruger-orange"
                          onClick={() => {
                            const pw = tempPassword();
                            if (window.confirm(`Se asignará la clave temporal:\n\n${pw}\n\nCópiala antes de continuar. ¿Restablecer?`))
                              patch(u.id, { password: pw }, `Clave de ${u.email} restablecida. Clave temporal: ${pw}`);
                          }}
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Restablecer clave
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-kruger-gray/40 px-2 py-1 text-xs hover:border-kruger-orange"
                          onClick={() => patch(u.id, { active: !u.active }, `${u.email} ${u.active ? "desactivado" : "activado"}.`)}
                        >
                          {u.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />} {u.active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" onClick={load} className="mt-4 inline-flex items-center gap-1 text-xs text-kruger-dark/55 hover:text-kruger-orange">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </section>
    </main>
  );
}

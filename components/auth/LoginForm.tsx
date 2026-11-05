"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, LogIn } from "lucide-react";
import { Field, inputClass } from "../acta/fields";
import { btnPrimary } from "../ui";
import { PasswordInput } from "./PasswordInput";

const ERRORS: Record<string, string> = {
  invalid_credentials: "Correo o clave incorrectos.",
  locked: "Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en 15 minutos.",
  auth_not_configured: "El acceso aún no está configurado en el servidor.",
};

export function LoginForm() {
  const [status, setStatus] = useState<{ configured: boolean; missing: string[] } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, missing: [] }));
  }, []);

  if (status && !status.configured)
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-semaforo-ambar/40 bg-semaforo-ambar/10 p-4 text-sm text-kruger-dark">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 text-semaforo-ambar" /> Acceso pendiente de configuración
        </p>
        <p>Faltan estas variables de entorno en Vercel:</p>
        <ul className="list-inside list-disc font-mono text-xs">
          {status.missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="text-xs text-kruger-dark/70">Agrégalas en Settings → Environment Variables y vuelve a publicar (Redeploy).</p>
      </div>
    );

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
          const data = (await res.json()) as { ok?: boolean; mustChange?: boolean; error?: string };
          if (!res.ok || !data.ok) throw new Error(data.error ?? "invalid_credentials");
          const next = new URLSearchParams(window.location.search).get("next");
          const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
          window.location.assign(data.mustChange ? "/cambiar-clave" : safeNext);
        } catch (err) {
          setError(ERRORS[err instanceof Error ? err.message : ""] ?? "No se pudo iniciar sesión.");
          setBusy(false);
        }
      }}
    >
      <Field label="Correo electrónico" htmlFor="email">
        <input id="email" type="email" autoComplete="username" autoFocus className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Clave" htmlFor="password">
        <PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-semaforo-rojo/5 px-3 py-2 text-sm text-semaforo-rojo">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !email || !password || !status} className={`${btnPrimary} w-full`}>
        <LogIn className="h-4 w-4" /> {busy ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}

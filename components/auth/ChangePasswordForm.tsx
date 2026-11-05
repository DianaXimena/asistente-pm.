"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Field } from "../acta/fields";
import { btnPrimary } from "../ui";
import { PasswordInput } from "./PasswordInput";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rules = [
    { ok: next.length >= 10, label: "Al menos 10 caracteres" },
    { ok: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(next) && /\d/.test(next), label: "Letras y números" },
    { ok: /[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]/.test(next), label: "Al menos un símbolo" },
    { ok: !!next && next === confirm, label: "Las dos claves coinciden" },
  ];
  const valid = !!current && rules.every((r) => r.ok);

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError("");
        const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) window.location.assign("/");
        else {
          setError(data.error ?? "No se pudo cambiar la clave.");
          setBusy(false);
        }
      }}
    >
      <Field label="Clave actual" htmlFor="current">
        <PasswordInput id="current" autoComplete="current-password" autoFocus value={current} onChange={setCurrent} />
      </Field>
      <Field label="Nueva clave" htmlFor="next">
        <PasswordInput id="next" autoComplete="new-password" value={next} onChange={setNext} />
      </Field>
      <Field label="Confirmar nueva clave" htmlFor="confirm">
        <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      </Field>
      <ul className="space-y-1 text-xs">
        {rules.map((r) => (
          <li key={r.label} className={r.ok ? "text-semaforo-verde" : "text-kruger-dark/55"}>
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> {r.label}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="rounded-xl bg-semaforo-rojo/5 px-3 py-2 text-sm text-semaforo-rojo">
          {error}
        </p>
      )}
      <button type="submit" disabled={!valid || busy} className={`${btnPrimary} w-full`}>
        <KeyRound className="h-4 w-4" /> {busy ? "Guardando…" : "Guardar nueva clave"}
      </button>
    </form>
  );
}

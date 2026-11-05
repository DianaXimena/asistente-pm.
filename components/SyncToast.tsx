"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useProject } from "@/lib/store";

/** Aviso flotante, visible en cualquier pantalla, ante conflictos o errores de guardado. */
export function SyncToast() {
  const { sync } = useProject();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const key = `${sync.status}:${sync.message ?? ""}`;
  useEffect(() => setDismissed(null), [key]);
  if ((sync.status !== "conflict" && sync.status !== "error") || !sync.message || dismissed === key) return null;
  return (
    <div role="alert" className="fixed bottom-4 left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 animate-fade items-start gap-3 rounded-2xl border border-semaforo-ambar/40 bg-white p-4 text-sm text-kruger-dark shadow-lg print:hidden">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-semaforo-ambar" />
      <p className="flex-1">{sync.message}</p>
      <button type="button" aria-label="Cerrar aviso" onClick={() => setDismissed(key)} className="rounded-lg p-1 text-kruger-dark/50 hover:text-kruger-orange">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

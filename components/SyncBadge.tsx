"use client";

import clsx from "clsx";
import { AlertTriangle, Cloud, CloudOff, Loader2 } from "lucide-react";
import { useProject } from "@/lib/store";
import { Tooltip } from "./Tooltip";

/** Estado de guardado: nube (base de datos) o solo este navegador. */
export function SyncBadge() {
  const { sync, hydrated } = useProject();
  if (!hydrated) return null;
  const view =
    sync.mode === "local"
      ? { icon: CloudOff, label: "Solo en este navegador", cls: "text-kruger-dark/60", tip: "La base de datos no está disponible: los datos se guardan únicamente en este navegador." }
      : sync.status === "saving"
        ? { icon: Loader2, label: "Guardando…", cls: "text-kruger-dark/70", tip: "Guardando los cambios en la base de datos." }
        : sync.status === "error" || sync.status === "conflict"
          ? { icon: AlertTriangle, label: sync.status === "conflict" ? "Versión actualizada" : "Sin guardar", cls: "text-semaforo-ambar", tip: sync.message ?? "" }
          : { icon: Cloud, label: "Guardado en la nube", cls: "text-semaforo-verde", tip: "Todos los cambios están guardados en la base de datos." };
  const Icon = view.icon;
  return (
    <Tooltip content={view.tip} side="bottom" className="inline-block">
      <span tabIndex={0} role="status" className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium outline-none", view.cls)}>
        <Icon className={clsx("h-4 w-4", sync.status === "saving" && "animate-spin")} /> {view.label}
      </span>
    </Tooltip>
  );
}

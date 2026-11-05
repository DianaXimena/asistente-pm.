"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, ExternalLink, FileUp, Loader2 } from "lucide-react";
import { DRIVE_ERRORS, uploadToPhase } from "@/lib/drive-upload";
import { useProject } from "@/lib/store";
import type { PhaseId, Project } from "@/lib/types";

/**
 * Selector de documento que, al elegir el archivo, lo guarda en Google Drive en la carpeta
 * Cliente / Proyecto / Fase. El nombre solo se registra cuando el archivo ya quedó guardado
 * (o si Drive no está configurado en el servidor, en cuyo caso se guarda solo el nombre).
 */
export function DriveFilePick({
  label,
  value,
  url,
  project,
  phaseId,
  onChange,
}: {
  label: string;
  value: string;
  url?: string;
  project: Project;
  phaseId: PhaseId;
  onChange: (name: string, url?: string) => void;
}) {
  const { setDriveFolders } = useProject();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError("");
    setNote("");
    onChange("", undefined); // Mientras sube, el documento no cuenta como adjunto.
    const r = await uploadToPhase(project, phaseId, [f]);
    setBusy(false);
    if (r.folders) setDriveFolders(project.project_id, phaseId, r.folders);
    const saved = r.files?.find((x) => x.ok);
    if (saved) return onChange(f.name, saved.url);
    if (r.error === "not_configured") {
      setNote("Google Drive no está configurado: se registró solo el nombre del archivo.");
      return onChange(f.name, undefined);
    }
    setError(DRIVE_ERRORS[r.error ?? ""] ?? r.files?.find((x) => !x.ok)?.error ?? "No se pudo guardar el archivo en Google Drive.");
  };

  return (
    <div className="space-y-1.5">
      <label
        className={clsx(
          "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed bg-white p-3 text-sm text-kruger-dark transition hover:border-kruger-orange",
          error ? "border-semaforo-rojo/50" : "border-kruger-gray/50",
          busy && "pointer-events-none opacity-70",
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-kruger-orange" /> : <FileUp className="h-5 w-5 shrink-0 text-kruger-orange" />}
        <span className="min-w-0 break-all">{busy ? "Guardando en Google Drive…" : value || label}</span>
        {value && !busy && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-semaforo-verde" />}
        <input type="file" className="sr-only" aria-label={label} disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {url && value && !busy && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-kruger-orange hover:underline">
          <ExternalLink className="h-3.5 w-3.5" /> Ver en Google Drive
        </a>
      )}
      {note && <p className="text-xs text-kruger-dark/60">{note}</p>}
      {error && (
        <p role="alert" className="text-xs text-semaforo-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

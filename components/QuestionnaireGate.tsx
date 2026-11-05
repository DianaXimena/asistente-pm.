"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, FilePlus2, FileUp, History, LayoutDashboard, Lock, ShieldCheck, SkipForward } from "lucide-react";
import { lockInfo } from "@/lib/locks";
import { DRIVE_ERRORS, phaseOfInput, uploadToPhase } from "@/lib/drive-upload";
import { missingRequirements } from "@/lib/assistant";
import { QUESTIONNAIRES } from "@/lib/questionnaires";
import { findInput, useProject } from "@/lib/store";
import type { Project, QuestionnaireId } from "@/lib/types";
import { RequireProject } from "./RequireProject";
import { BlockedAction } from "./BlockedAction";
import { btnPrimary, btnSecondary, card } from "./ui";

/**
 * Pantalla de entrada a cada cuestionario: permite llenarlo u omitirlo.
 * Omitir solo es posible si se adjunta el documento correspondiente.
 */
export function QuestionnaireGate({
  id,
  children,
  readOnlyView,
}: {
  id: QuestionnaireId;
  children: (project: Project) => React.ReactNode;
  /** Vista de solo lectura cuando el insumo está congelado. */
  readOnlyView?: (project: Project) => React.ReactNode;
}) {
  return (
    <RequireProject>
      {(p) => (
        <Gate id={id} project={p} readOnlyView={readOnlyView}>
          {children}
        </Gate>
      )}
    </RequireProject>
  );
}

function Gate({
  id,
  project,
  children,
  readOnlyView,
}: {
  id: QuestionnaireId;
  project: Project;
  children: (project: Project) => React.ReactNode;
  readOnlyView?: (project: Project) => React.ReactNode;
}) {
  const { attachFile, setDriveFolders } = useProject();
  const input = findInput(project, id);
  const [mode, setMode] = useState<"auto" | "form" | "replace">("auto");
  const meta = QUESTIONNAIRES[id];
  const missing = input ? missingRequirements(project, input) : [];

  if (!input) return <>{children(project)}</>;

  // Hallazgo 2: lo aprobado queda congelado; solo cambia por Control de Cambios.
  const lock = lockInfo(project, id);
  if (lock.locked) {
    return (
      <div className="space-y-6">
        <div className={card}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-semaforo-verde" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-kruger-dark">{lock.reason}</p>
              {lock.approvedAt && (
                <p className="mt-1 text-xs text-kruger-dark/60">
                  Sello del sistema: {new Date(lock.approvedAt).toLocaleString("es-EC", { dateStyle: "long", timeStyle: "medium" })}
                </p>
              )}
              {input.source === "archivo" && (
                <p className="mt-1 break-all text-xs text-kruger-dark/60">
                  Documento:{" "}
                  {input.file_url ? (
                    <a href={input.file_url} target="_blank" rel="noreferrer" className="text-kruger-orange hover:underline">
                      {input.file_name}
                    </a>
                  ) : (
                    input.file_name
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-kruger-gray/20 pt-6">
            <Link href="/proyecto" className={btnPrimary}>
              <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
            </Link>
            {lock.viaChange && (
              <Link href="/cuestionario/solicitud-cambio" className={btnSecondary}>
                <FilePlus2 className="h-4 w-4" /> Solicitar cambio
              </Link>
            )}
            <Link href="/auditoria" className={btnSecondary}>
              <History className="h-4 w-4" /> Ver bitácora de auditoría
            </Link>
          </div>
        </div>
        {readOnlyView?.(project)}
      </div>
    );
  }

  // Completado con archivo: se muestra el resumen salvo que el PM decida reemplazarlo.
  if (input.source === "archivo" && mode === "auto") {
    return (
      <div className={card}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-semaforo-verde" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-kruger-dark">Cuestionario omitido con documento adjunto</p>
            <p className="mt-1 break-all text-sm text-kruger-dark/70">
              Archivo:{" "}
              {input.file_url ? (
                <a href={input.file_url} target="_blank" rel="noreferrer" className="font-semibold text-kruger-orange hover:underline">
                  {input.file_name}
                </a>
              ) : (
                <strong>{input.file_name}</strong>
              )}{" "}
              · Estado: {input.status}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-kruger-gray/20 pt-6 sm:flex-row">
          <Link href="/proyecto" className={btnPrimary}>
            <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
          </Link>
          <button type="button" className={btnSecondary} onClick={() => setMode("replace")}>
            <FileUp className="h-4 w-4" /> Reemplazar archivo
          </button>
          {missing.length === 0 && (
            <button type="button" className={btnSecondary} onClick={() => setMode("form")}>
              <ClipboardList className="h-4 w-4" /> Llenar el cuestionario
            </button>
          )}
        </div>
      </div>
    );
  }

  const showChoice = mode === "replace" || (mode === "auto" && input.status === "No Iniciado");
  if (!showChoice) return <>{children(project)}</>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={`${card} flex flex-col`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-kruger-orange-soft text-kruger-orange">
          <ClipboardList className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-kruger-dark">Llenar el cuestionario</h2>
        <p className="mt-2 flex-1 text-sm text-kruger-dark/70">{meta.description}</p>
        <p className="mt-3 text-xs text-kruger-dark/55">{meta.hint}</p>
        {missing.length > 0 && (
          <p className="mt-4 flex items-center gap-2 text-xs text-kruger-dark/60">
            <Lock className="h-3.5 w-3.5" /> Requiere aprobar antes: {missing.map((m) => m.artifact_name).join(", ")}
          </p>
        )}
        <BlockedAction
          className="mt-4 w-full"
          blockers={missing.map((m) => ({ label: `Aprobar: ${m.artifact_name}`, href: m.questionnaire ? QUESTIONNAIRES[m.questionnaire].href : "/proyecto" }))}
        >
          <button type="button" className={`${btnPrimary} w-full`} disabled={missing.length > 0} onClick={() => setMode("form")}>
            Comenzar cuestionario
          </button>
        </BlockedAction>
      </div>

      <SkipCard
        onSkip={async (f) => {
          const phaseId = phaseOfInput(project, id);
          const r = await uploadToPhase(project, phaseId, [f]);
          if (r.folders) setDriveFolders(project.project_id, phaseId, r.folders);
          const saved = r.files?.find((x) => x.ok);
          if (saved || r.error === "not_configured") {
            attachFile(id, f.name, saved?.url);
            setMode("auto");
            return null;
          }
          return DRIVE_ERRORS[r.error ?? ""] ?? r.files?.find((x) => !x.ok)?.error ?? "No se pudo guardar el archivo en Google Drive.";
        }}
      />
    </div>
  );
}

/** onSkip sube el archivo y devuelve null si todo salió bien, o el mensaje de error. */
function SkipCard({ onSkip }: { onSkip: (file: File) => Promise<string | null> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = fileObj?.name ?? "";
  return (
    <div className={`${card} flex flex-col`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-kruger-gray-soft text-kruger-dark/70">
        <SkipForward className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-kruger-dark">Omitir con documento</h2>
      <p className="mt-2 text-sm text-kruger-dark/70">
        Si ya tienes el documento, adjúntalo para omitir el cuestionario. <strong>Sin archivo no se puede omitir.</strong>
      </p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="mt-4 flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-kruger-gray/50 bg-kruger-gray-soft px-4 py-6 text-center transition hover:border-kruger-orange hover:bg-kruger-orange-soft"
      >
        <FileUp className="h-6 w-6 text-kruger-orange" />
        <span className="break-all text-sm font-medium text-kruger-dark">{file || "Seleccionar archivo"}</span>
      </button>
      <input ref={ref} type="file" className="sr-only" aria-label="Documento para omitir el cuestionario" onChange={(e) => setFileObj(e.target.files?.[0] ?? null)} />
      <BlockedAction className="mt-4 w-full" blockers={file || busy ? [] : [{ label: "Adjuntar el documento (Seleccionar archivo)", action: () => ref.current?.click() }]}>
      <button
        type="button"
        disabled={!file || busy}
        onClick={async () => {
          if (!fileObj) return;
          setBusy(true);
          setError("");
          const err = await onSkip(fileObj);
          setBusy(false);
          if (err) setError(err);
        }}
        className={`${btnSecondary} w-full disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <SkipForward className="h-4 w-4" /> {busy ? "Guardando en Google Drive…" : "Omitir cuestionario"}
      </button>
      </BlockedAction>
      <p className="mt-2 text-xs text-kruger-dark/55">El documento se guarda en Drive en la carpeta Cliente / Proyecto / Fase.</p>
      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-semaforo-rojo/5 px-3 py-2 text-xs text-semaforo-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, FileUp, LayoutDashboard, Lock, SkipForward } from "lucide-react";
import { missingRequirements } from "@/lib/assistant";
import { QUESTIONNAIRES } from "@/lib/questionnaires";
import { findInput, useProject } from "@/lib/store";
import type { Project, QuestionnaireId } from "@/lib/types";
import { RequireProject } from "./RequireProject";
import { btnPrimary, btnSecondary, card } from "./ui";

/**
 * Pantalla de entrada a cada cuestionario: permite llenarlo u omitirlo.
 * Omitir solo es posible si se adjunta el documento correspondiente.
 */
export function QuestionnaireGate({ id, children }: { id: QuestionnaireId; children: (project: Project) => React.ReactNode }) {
  return <RequireProject>{(p) => <Gate id={id} project={p}>{children}</Gate>}</RequireProject>;
}

function Gate({ id, project, children }: { id: QuestionnaireId; project: Project; children: (project: Project) => React.ReactNode }) {
  const { attachFile } = useProject();
  const input = findInput(project, id);
  const [mode, setMode] = useState<"auto" | "form" | "replace">("auto");
  const meta = QUESTIONNAIRES[id];
  const missing = input ? missingRequirements(project, input) : [];

  if (!input) return <>{children(project)}</>;

  // Completado con archivo: se muestra el resumen salvo que el PM decida reemplazarlo.
  if (input.source === "archivo" && mode === "auto") {
    return (
      <div className={card}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-semaforo-verde" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-kruger-dark">Cuestionario omitido con documento adjunto</p>
            <p className="mt-1 break-all text-sm text-kruger-dark/70">
              Archivo: <strong>{input.file_name}</strong> · Estado: {input.status}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-kruger-gray/20 pt-6 sm:flex-row">
          <Link href="/" className={btnPrimary}>
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
        {missing.length > 0 ? (
          <div className="mt-6 rounded-xl bg-kruger-gray-soft p-4 text-sm text-kruger-dark">
            <p className="flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4 text-kruger-dark/60" /> Primero debe estar aprobado:
            </p>
            <ul className="mt-2 space-y-1">
              {missing.map((m) => (
                <li key={m.artifact_name}>
                  {m.questionnaire ? (
                    <Link href={QUESTIONNAIRES[m.questionnaire].href} className="text-kruger-orange hover:underline">
                      {m.artifact_name}
                    </Link>
                  ) : (
                    m.artifact_name
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <button type="button" className={`${btnPrimary} mt-6`} onClick={() => setMode("form")}>
            Comenzar cuestionario
          </button>
        )}
      </div>

      <SkipCard
        onSkip={(name) => {
          attachFile(id, name);
          setMode("auto");
        }}
      />
    </div>
  );
}

function SkipCard({ onSkip }: { onSkip: (fileName: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState("");
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
      <input ref={ref} type="file" className="sr-only" aria-label="Documento para omitir el cuestionario" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
      <button type="button" disabled={!file} onClick={() => onSkip(file)} className={`${btnSecondary} mt-4 disabled:cursor-not-allowed disabled:opacity-50`}>
        <SkipForward className="h-4 w-4" /> Omitir cuestionario
      </button>
    </div>
  );
}

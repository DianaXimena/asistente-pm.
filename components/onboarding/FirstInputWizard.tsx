"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, FileUp, Sparkles } from "lucide-react";
import { APPROACH_LABEL } from "@/lib/assistant";
import { DOC_TYPES, approachFromDocType, approachFromMicroEvaluator, suggestDocType } from "@/lib/approach";
import { useProject } from "@/lib/store";
import type { Approach, InitialDocType } from "@/lib/types";
import { RequireProject } from "../RequireProject";
import { Field, inputClass } from "../acta/fields";
import { btnGhost, btnPrimary, btnSecondary, card } from "../ui";

type Stage = "upload" | "evaluator" | "result";

export function FirstInputWizard() {
  return <RequireProject>{() => <Wizard />}</RequireProject>;
}

function Wizard() {
  const { project, setApproach } = useProject();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [fileName, setFileName] = useState("");
  const [docType, setDocType] = useState<InitialDocType | "">("");
  const [suggested, setSuggested] = useState<InitialDocType | null>(null);
  const [stable, setStable] = useState<boolean | null>(null);
  const [fixed, setFixed] = useState<boolean | null>(null);
  const [result, setResult] = useState<Approach | null>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const s = suggestDocType(f.name);
    setFileName(f.name);
    setSuggested(s);
    setDocType(s);
  };

  const detect = () => {
    if (!fileName || !docType) return;
    if (docType === "Otro") return setStage("evaluator");
    setResult(approachFromDocType(docType));
    setStage("result");
  };

  const confirm = () => {
    if (!result || !docType) return;
    setApproach(result, { file_name: fileName, doc_type: docType, received_at: new Date().toISOString() });
    router.push("/");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-kruger-dark/70">
        <strong className="text-kruger-dark">{project?.project_name}</strong> · {project?.client_name}
      </p>

      {stage === "upload" && (
        <div className={card}>
          <p className="text-sm text-kruger-dark/70">
            El tipo del primer documento define el enfoque del proyecto: <strong>Predictivo</strong>, <strong>Ágil</strong> o{" "}
            <strong>Híbrido</strong>.
          </p>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
            className="mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-kruger-gray/50 bg-kruger-gray-soft px-6 py-10 text-center transition hover:border-kruger-orange hover:bg-kruger-orange-soft"
          >
            <FileUp className="h-8 w-8 text-kruger-orange" />
            <span className="text-sm font-semibold text-kruger-dark">{fileName || "Selecciona o arrastra el documento"}</span>
            <span className="text-xs text-kruger-dark/55">
              {fileName ? "Haz clic para cambiar el archivo" : "Contrato, SOW, pliego, backlog, visión del producto…"}
            </span>
          </button>
          <input ref={fileRef} type="file" className="sr-only" aria-label="Primer insumo" onChange={(e) => onFile(e.target.files?.[0])} />

          {fileName && (
            <div className="mt-6">
              <Field
                label="Tipo de documento"
                htmlFor="doc_type"
                hint={
                  suggested && suggested !== "Otro"
                    ? `Sugerido según el nombre del archivo: ${suggested}. Confirma o corrige.`
                    : "No se reconoció el tipo por el nombre del archivo. Selecciónalo o elige “Otro / No estoy seguro”."
                }
              >
                <select id="doc_type" className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value as InitialDocType)}>
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Otro">Otro / No estoy seguro</option>
                </select>
              </Field>
            </div>
          )}

          <p className="mt-6 text-xs text-kruger-dark/55">
            Por ahora se registran el nombre y el tipo del archivo; su almacenamiento en Google Drive llegará con esa integración.
          </p>

          <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-kruger-gray/20 pt-6 sm:flex-row">
            <Link href="/" className={btnGhost}>
              Lo cargaré después
            </Link>
            <button type="button" onClick={detect} disabled={!fileName || !docType} className={btnPrimary}>
              <Sparkles className="h-4 w-4" /> Detectar enfoque
            </button>
          </div>
        </div>
      )}

      {stage === "evaluator" && (
        <div className={card}>
          <p className="text-xs font-semibold uppercase tracking-wide text-kruger-orange">Micro-evaluador · 2 preguntas</p>
          <p className="mt-2 text-sm text-kruger-dark/70">No hay certeza con el archivo inicial. Responde para determinar el enfoque.</p>
          <div className="mt-6 space-y-6">
            <YesNo label="1. ¿El alcance es estable desde el inicio?" value={stable} onChange={setStable} />
            <YesNo
              label="2. ¿Existen restricciones regulatorias o contractuales fijas de entrega?"
              value={fixed}
              onChange={setFixed}
            />
          </div>
          <div className="mt-8 flex justify-between gap-3 border-t border-kruger-gray/20 pt-6">
            <button type="button" onClick={() => setStage("upload")} className={btnGhost}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <button
              type="button"
              disabled={stable === null || fixed === null}
              onClick={() => {
                setResult(approachFromMicroEvaluator(!!stable, !!fixed));
                setStage("result");
              }}
              className={btnPrimary}
            >
              Ver resultado <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <div className={card}>
          <p className="text-xs font-semibold uppercase tracking-wide text-kruger-dark/55">Enfoque detectado</p>
          <p className="mt-2 text-3xl font-semibold text-kruger-orange">{APPROACH_LABEL[result.type]}</p>
          <p className="mt-3 text-sm text-kruger-dark">{result.rationale}</p>
          <dl className="mt-6 grid gap-4 rounded-xl bg-kruger-gray-soft p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-kruger-dark/55">Archivo</dt>
              <dd className="mt-0.5 break-all font-medium text-kruger-dark">{fileName}</dd>
            </div>
            <div>
              <dt className="text-xs text-kruger-dark/55">Detectado a partir de</dt>
              <dd className="mt-0.5 font-medium text-kruger-dark">{result.detected_from}</dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-kruger-gray/20 pt-6 sm:flex-row">
            <button type="button" onClick={() => setStage("upload")} className={btnSecondary}>
              Corregir
            </button>
            <button type="button" onClick={confirm} className={btnPrimary}>
              Confirmar e ir al Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-kruger-dark">{label}</legend>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-xs">
        {[
          { v: true, l: "Sí" },
          { v: false, l: "No" },
        ].map((o) => (
          <label
            key={o.l}
            className={clsx(
              "cursor-pointer rounded-xl border-2 px-4 py-2.5 text-center text-sm font-semibold transition focus-within:ring-4 focus-within:ring-kruger-orange/15",
              value === o.v ? "border-kruger-orange bg-kruger-orange-soft text-kruger-orange" : "border-kruger-gray/30 text-kruger-dark",
            )}
          >
            <input type="radio" className="sr-only" checked={value === o.v} onChange={() => onChange(o.v)} />
            {o.l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

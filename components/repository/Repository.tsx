"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ExternalLink, FilePlus2, FolderOpen, Loader2, Search, Sparkles } from "lucide-react";
import { APPROACH_LABEL } from "@/lib/assistant";
import { PHASE_TOOLTIPS } from "@/lib/pmp";
import { useProject } from "@/lib/store";
import { DRIVE_ROOT_FOLDER_ID, PHASE_SHORT, TEMPLATES, folderTypeFor, isRecommended, type DocTemplate, type TemplateType } from "@/lib/templates";
import type { PhaseId, Project } from "@/lib/types";
import { inputClass } from "../acta/fields";
import { Tooltip } from "../Tooltip";
import { btnPrimary, btnSecondary, card } from "../ui";

const TYPES: TemplateType[] = ["Predictivo", "Ágil", "Híbrido", "General"];
const PHASES: PhaseId[] = ["inicio", "planificacion", "ejecucion", "control", "cierre"];
const GUIDE_URL = "https://github.com/DianaXimena/asistente-pm./blob/HEAD/google-apps-script/README.md";

type RowState = { status: "idle" | "loading" | "error"; message?: string };

export function Repository() {
  const { project, projects, selectProject, hydrated, saveDriveDoc } = useProject();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<TemplateType | "">("");
  const [phase, setPhase] = useState<PhaseId | "">("");
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/drive/status")
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, []);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return TEMPLATES.filter(
      (t) =>
        (!term || t.name.toLowerCase().includes(term) || t.purpose.toLowerCase().includes(term)) &&
        (!type || t.types.includes(type)) &&
        (!phase || t.phases.includes(phase)) &&
        (!onlyRecommended || isRecommended(t, project?.approach?.type)),
    );
  }, [q, type, phase, onlyRecommended, project?.approach?.type]);

  const generate = async (t: DocTemplate, p: Project) => {
    setRows((r) => ({ ...r, [t.id]: { status: "loading" } }));
    setNotice("");
    try {
      const res = await fetch("/api/drive/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: t.id,
          client: p.client_name,
          project: p.project_name,
          approach: p.approach?.type ?? null,
          date: new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" }),
        }),
      });
      const data = (await res.json()) as { id?: string; url?: string; folder?: string; reused?: boolean; error?: string };
      if (!res.ok || !data.url || !data.id) throw new Error(data.error ?? "drive_error");
      saveDriveDoc(t.id, { id: data.id, url: data.url, folder: data.folder ?? folderTypeFor(t, p.approach?.type), generated_at: new Date().toISOString() }, t.name);
      setRows((r) => ({ ...r, [t.id]: { status: "idle" } }));
      setNotice(`${t.name}: ${data.reused ? "ya existía y se vinculó" : "generado"} en la carpeta “${data.folder}”.`);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      const message =
        code === "not_configured"
          ? "La integración con Google Drive no está configurada."
          : code === "unauthorized"
            ? "El token del servidor no coincide con el de Apps Script."
            : code === "drive_unreachable"
              ? "No se pudo contactar a Google Apps Script."
              : `No se pudo generar el documento (${code || "error"}).`;
      setRows((r) => ({ ...r, [t.id]: { status: "error", message } }));
    }
  };

  return (
    <div className="space-y-6">
      {configured === false && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-semaforo-ambar/40 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2 text-sm text-kruger-dark">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semaforo-ambar" />
            La conexión con Google Drive aún no está configurada en el servidor. Puedes revisar el catálogo; para generar documentos sigue la guía de instalación.
          </p>
          <a href={GUIDE_URL} target="_blank" rel="noreferrer" className={clsx(btnSecondary, "shrink-0")}>
            Ver guía <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Proyecto de contexto: alimenta el encabezado de cada documento */}
      <section className={clsx(card, "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
        {hydrated && projects.length === 0 ? (
          <p className="text-sm text-kruger-dark/70">
            Crea un proyecto en el{" "}
            <Link href="/" className="font-medium text-kruger-orange hover:underline">
              portafolio
            </Link>{" "}
            para generar documentos con su encabezado.
          </p>
        ) : (
          <>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-kruger-dark/60">
              Proyecto para el encabezado (cliente, proyecto y fecha)
              <select className={inputClass} value={project?.project_id ?? ""} onChange={(e) => selectProject(e.target.value)}>
                {!project && <option value="">Selecciona un proyecto…</option>}
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.client_name} · {p.project_name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {project?.approach && (
                <span className="rounded-full bg-kruger-orange-soft px-3 py-1 font-semibold text-kruger-orange">Enfoque {APPROACH_LABEL[project.approach.type]}</span>
              )}
              <a
                href={`https://drive.google.com/drive/folders/${DRIVE_ROOT_FOLDER_ID}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-kruger-gray/40 px-3 py-1 font-medium text-kruger-dark hover:border-kruger-orange"
              >
                <FolderOpen className="h-3.5 w-3.5 text-kruger-orange" /> Carpeta madre en Drive
              </a>
            </div>
          </>
        )}
      </section>

      {/* Filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kruger-gray" />
          <input aria-label="Buscar documento" className={clsx(inputClass, "pl-9")} placeholder="Buscar por nombre o propósito" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select aria-label="Filtrar por tipo de proyecto" className={clsx(inputClass, "md:w-48")} value={type} onChange={(e) => setType(e.target.value as TemplateType | "")}>
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Filtrar por grupo de procesos" className={clsx(inputClass, "md:w-56")} value={phase} onChange={(e) => setPhase(e.target.value as PhaseId | "")}>
          <option value="">Todos los grupos de procesos</option>
          {PHASES.map((p) => (
            <option key={p} value={p}>
              {PHASE_SHORT[p]}
            </option>
          ))}
        </select>
        {project?.approach && (
          <label className="flex shrink-0 items-center gap-2 text-sm text-kruger-dark">
            <input type="checkbox" className="h-4 w-4 accent-kruger-orange" checked={onlyRecommended} onChange={(e) => setOnlyRecommended(e.target.checked)} />
            Solo para mi enfoque
          </label>
        )}
      </div>

      {notice && <p className="rounded-xl bg-semaforo-verde/10 px-4 py-3 text-sm text-kruger-dark">{notice}</p>}

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-hidden rounded-2xl border border-kruger-gray/25 bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-kruger-gray-soft text-xs uppercase tracking-wide text-kruger-dark/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre del Documento</th>
              <th className="px-4 py-3 font-semibold">Tipo de Proyecto</th>
              <th className="px-4 py-3 font-semibold">Grupo de Procesos (Fase)</th>
              <th className="px-4 py-3 font-semibold">Propósito Principal</th>
              <th className="px-4 py-3 text-right font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kruger-gray/20">
            {list.map((t) => (
              <tr key={t.id} className="align-top transition hover:bg-kruger-orange-soft/40">
                <td className="px-4 py-4">
                  <p className="font-semibold text-kruger-dark">{t.name}</p>
                  {isRecommended(t, project?.approach?.type) && <RecommendedBadge />}
                </td>
                <td className="px-4 py-4">
                  <TypeChips t={t} />
                </td>
                <td className="px-4 py-4">
                  <PhaseChips t={t} />
                </td>
                <td className="max-w-sm px-4 py-4 text-kruger-dark/75">{t.purpose}</td>
                <td className="px-4 py-4 text-right">
                  <Action t={t} project={project} configured={configured} state={rows[t.id]} onGenerate={generate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-kruger-dark/60">Ningún documento coincide con los filtros.</p>}
      </div>

      {/* Tarjetas (móvil) */}
      <ul className="space-y-3 md:hidden">
        {list.map((t) => (
          <li key={t.id} className={card}>
            <p className="font-semibold text-kruger-dark">{t.name}</p>
            {isRecommended(t, project?.approach?.type) && <RecommendedBadge />}
            <div className="mt-3 flex flex-wrap gap-2">
              <TypeChips t={t} />
              <PhaseChips t={t} />
            </div>
            <p className="mt-3 text-sm text-kruger-dark/75">{t.purpose}</p>
            <div className="mt-4">
              <Action t={t} project={project} configured={configured} state={rows[t.id]} onGenerate={generate} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const RecommendedBadge = () => (
  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-kruger-orange">
    <Sparkles className="h-3 w-3" /> Recomendado para el enfoque del proyecto
  </span>
);

function TypeChips({ t }: { t: DocTemplate }) {
  return (
    <span className="flex flex-wrap gap-1">
      {t.types.map((ty) => (
        <span key={ty} className="rounded-full bg-kruger-gray-soft px-2.5 py-0.5 text-xs font-medium text-kruger-dark">
          {ty}
        </span>
      ))}
    </span>
  );
}

function PhaseChips({ t }: { t: DocTemplate }) {
  return (
    <span className="flex flex-wrap gap-1">
      {t.phases.map((p) => (
        <Tooltip key={p} content={PHASE_TOOLTIPS[p]} side="top" className="inline-block">
          <span tabIndex={0} className="inline-block cursor-help rounded-full border border-kruger-orange/30 px-2.5 py-0.5 text-xs font-medium text-kruger-orange outline-none focus-visible:ring-2 focus-visible:ring-kruger-orange/40">
            {PHASE_SHORT[p]}
          </span>
        </Tooltip>
      ))}
    </span>
  );
}

function Action({
  t,
  project,
  configured,
  state,
  onGenerate,
}: {
  t: DocTemplate;
  project: Project | null;
  configured: boolean | null;
  state?: RowState;
  onGenerate: (t: DocTemplate, p: Project) => void;
}) {
  const existing = project?.drive_docs?.[t.id];
  if (existing)
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <a href={existing.url} target="_blank" rel="noreferrer" className={clsx(btnSecondary, "whitespace-nowrap")}>
          <ExternalLink className="h-4 w-4 text-kruger-orange" /> Abrir en Google Docs
        </a>
        <span className="text-[11px] text-kruger-dark/55">Carpeta: {existing.folder}</span>
      </span>
    );
  const disabled = !project || configured !== true || state?.status === "loading";
  const reason = !project ? "Selecciona un proyecto" : configured === false ? "Integración con Google Drive no configurada" : "";
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" className={clsx(btnPrimary, "whitespace-nowrap")} disabled={disabled} title={reason} onClick={() => project && onGenerate(t, project)}>
        {state?.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
        {state?.status === "loading" ? "Generando…" : "Generar en Google Docs"}
      </button>
      {project && <span className="text-[11px] text-kruger-dark/55">Se guardará en: {folderTypeFor(t, project.approach?.type)}</span>}
      {state?.status === "error" && <span className="max-w-[16rem] text-right text-[11px] text-semaforo-rojo">{state.message}</span>}
    </span>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Copy, ExternalLink, FolderOpen, Rocket, Search, Sparkles } from "lucide-react";
import { PHASE_TOOLTIPS } from "@/lib/pmp";
import { useProject } from "@/lib/store";
import { DRIVE_ROOT_FOLDER_ID, PHASE_SHORT, TEMPLATES, copyUrl, isRecommended, type DocTemplate, type TemplateType } from "@/lib/templates";
import type { PhaseId } from "@/lib/types";
import { inputClass } from "../acta/fields";
import { Tooltip } from "../Tooltip";
import { btnPrimary, btnSecondary, card } from "../ui";

const TYPES: TemplateType[] = ["Predictivo", "Ágil", "Híbrido", "General"];
const PHASES: PhaseId[] = ["inicio", "planificacion", "ejecucion", "control", "cierre"];
const ROOT_URL = `https://drive.google.com/drive/folders/${DRIVE_ROOT_FOLDER_ID}`;

type DocLink = { url: string; doc_id: string };
interface Catalog {
  docs: Record<string, DocLink>;
  canSeed: boolean;
  driveConfigured: boolean;
}

/**
 * Repositorio de acceso inmediato: cada plantilla enlaza al documento maestro que ya
 * existe en la carpeta madre de Google Drive. No genera nada bajo demanda.
 */
export function Repository() {
  const { project } = useProject();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState<TemplateType | "">("");
  const [phase, setPhase] = useState<PhaseId | "">("");
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  const load = () =>
    fetch("/api/templates", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Catalog) => setCatalog(d))
      .catch(() => setLoadError(true));
  useEffect(() => {
    load();
  }, []);

  const approach = project?.approach?.type;
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return TEMPLATES.filter(
      (t) =>
        (!term || t.name.toLowerCase().includes(term) || t.purpose.toLowerCase().includes(term)) &&
        (!type || t.types.includes(type)) &&
        (!phase || t.phases.includes(phase)) &&
        (!onlyRecommended || isRecommended(t, approach)),
    );
  }, [q, type, phase, onlyRecommended, approach]);

  const ready = catalog ? TEMPLATES.filter((t) => catalog.docs[t.id]).length : 0;
  const complete = ready === TEMPLATES.length;

  return (
    <div className="space-y-6">
      {catalog && !complete && (catalog.canSeed ? <SeedPanel catalog={catalog} onDone={load} /> : <PendingNotice ready={ready} />)}
      {loadError && (
        <p role="alert" className="rounded-xl bg-semaforo-rojo/5 px-4 py-3 text-sm text-semaforo-rojo">
          No se pudo cargar el repositorio. Recarga la página.
        </p>
      )}

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
        {approach && (
          <label className="flex shrink-0 items-center gap-2 text-sm text-kruger-dark">
            <input type="checkbox" className="h-4 w-4 accent-kruger-orange" checked={onlyRecommended} onChange={(e) => setOnlyRecommended(e.target.checked)} />
            Solo para mi enfoque
          </label>
        )}
        <a href={ROOT_URL} target="_blank" rel="noreferrer" className={clsx(btnSecondary, "shrink-0 whitespace-nowrap")}>
          <FolderOpen className="h-4 w-4 text-kruger-orange" /> Carpeta madre
        </a>
      </div>

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
            {list.map((t) => {
              const doc = catalog?.docs[t.id];
              return (
                <tr key={t.id} className="align-top transition hover:bg-kruger-orange-soft/40">
                  <td className="px-4 py-4">
                    <DocName t={t} doc={doc} />
                    {isRecommended(t, approach) && <RecommendedBadge />}
                  </td>
                  <td className="px-4 py-4">
                    <TypeChips t={t} />
                  </td>
                  <td className="px-4 py-4">
                    <PhaseChips t={t} />
                  </td>
                  <td className="max-w-sm px-4 py-4 text-kruger-dark/75">{t.purpose}</td>
                  <td className="px-4 py-4 text-right">
                    <DocActions doc={doc} name={t.name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-kruger-dark/60">Ningún documento coincide con los filtros.</p>}
      </div>

      {/* Tarjetas (móvil) */}
      <ul className="space-y-3 md:hidden">
        {list.map((t) => {
          const doc = catalog?.docs[t.id];
          return (
            <li key={t.id} className={card}>
              <DocName t={t} doc={doc} />
              {isRecommended(t, approach) && <RecommendedBadge />}
              <div className="mt-3 flex flex-wrap gap-2">
                <TypeChips t={t} />
                <PhaseChips t={t} />
              </div>
              <p className="mt-3 text-sm text-kruger-dark/75">{t.purpose}</p>
              <div className="mt-4">
                <DocActions doc={doc} name={t.name} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** El nombre también abre el documento maestro. */
function DocName({ t, doc }: { t: DocTemplate; doc?: DocLink }) {
  return doc ? (
    <a href={doc.url} target="_blank" rel="noreferrer" className="font-semibold text-kruger-dark hover:text-kruger-orange hover:underline">
      {t.name}
    </a>
  ) : (
    <p className="font-semibold text-kruger-dark">{t.name}</p>
  );
}

function DocActions({ doc, name }: { doc?: DocLink; name: string }) {
  if (!doc) return <span className="text-xs text-kruger-dark/55">Pendiente de carga inicial</span>;
  return (
    <span className="inline-flex flex-col items-end gap-1.5">
      <a href={doc.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${name} en Google Docs`} className={clsx(btnPrimary, "whitespace-nowrap")}>
        <ExternalLink className="h-4 w-4" /> Abrir en Google Docs
      </a>
      <a href={copyUrl(doc.doc_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-kruger-orange hover:underline">
        <Copy className="h-3.5 w-3.5" /> Hacer una copia
      </a>
    </span>
  );
}

function PendingNotice({ ready }: { ready: number }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-semaforo-ambar/40 bg-white p-5 text-sm text-kruger-dark shadow-card">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-semaforo-ambar" />
      <p>
        El repositorio aún no está completo ({ready} de {TEMPLATES.length} plantillas disponibles). Un administrador debe realizar la carga inicial.
      </p>
    </div>
  );
}

/**
 * Carga inicial (una sola vez): crea en la carpeta madre las plantillas que falten y
 * registra sus enlaces. Se procesa una plantilla por petición.
 */
function SeedPanel({ catalog, onDone }: { catalog: Catalog; onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const missing = TEMPLATES.filter((t) => !catalog.docs[t.id]);

  const run = async () => {
    setRunning(true);
    setErrors([]);
    setDone(0);
    const errs: string[] = [];
    for (const t of missing) {
      const res = await fetch("/api/templates/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: t.id }),
      }).catch(() => null);
      const data = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : { error: "drive_unreachable" };
      if (!res?.ok) errs.push(`${t.name}: ${data.error ?? "error"}`);
      setDone((d) => d + 1);
    }
    setErrors(errs);
    setRunning(false);
    onDone();
  };

  return (
    <section className="space-y-4 rounded-2xl border border-kruger-orange/40 bg-white p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kruger-orange-soft text-kruger-orange">
          <Rocket className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-kruger-dark">Carga inicial del repositorio (se realiza una sola vez)</p>
          <p className="mt-1 text-sm text-kruger-dark/70">
            Crea en la carpeta madre de Google Drive {missing.length === TEMPLATES.length ? "las 13 plantillas estándar" : `las ${missing.length} plantillas que faltan`} y
            guarda sus enlaces para que todos los usuarios accedan al instante. Solo los administradores ven este panel.
          </p>
        </div>
      </div>
      {!catalog.driveConfigured ? (
        <p className="rounded-xl bg-semaforo-ambar/10 px-4 py-3 text-sm text-kruger-dark">
          Falta configurar GOOGLE_APPS_SCRIPT_URL y GOOGLE_APPS_SCRIPT_TOKEN en Vercel.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className={btnPrimary} disabled={running} onClick={run}>
            <Rocket className="h-4 w-4" /> {running ? `Creando… ${done}/${missing.length}` : "Inicializar repositorio"}
          </button>
          {running && (
            <div className="h-2 w-48 rounded-full bg-kruger-gray-soft" role="progressbar" aria-valuenow={done} aria-valuemax={missing.length} aria-label="Progreso de la carga inicial">
              <div className="h-2 rounded-full bg-kruger-orange transition-[width]" style={{ width: `${(done / Math.max(1, missing.length)) * 100}%` }} />
            </div>
          )}
        </div>
      )}
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl bg-semaforo-rojo/5 px-4 py-3 text-sm text-semaforo-rojo">
          <p className="font-medium">No se pudieron crear {errors.length} plantilla(s). Puedes reintentar: las ya creadas no se duplican.</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const RecommendedBadge = () => (
  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-kruger-orange">
    <Sparkles className="h-3 w-3" /> Aplica al enfoque del proyecto activo
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
          <span
            tabIndex={0}
            className="inline-block cursor-help rounded-full border border-kruger-orange/30 px-2.5 py-0.5 text-xs font-medium text-kruger-orange outline-none focus-visible:ring-2 focus-visible:ring-kruger-orange/40"
          >
            {PHASE_SHORT[p]}
          </span>
        </Tooltip>
      ))}
    </span>
  );
}

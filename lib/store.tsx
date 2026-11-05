"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { calcInicioProgress } from "./acta";
import { canAdvance } from "./assistant";
import { appendAudit } from "./audit";
import { lockInfo } from "./locks";
import { coverage, isRequirementDefined } from "./rtm";
import { createProject, normalizeProject } from "./project-factory";
import { closureStats, closureOf, isAdminClosed, isContractClosed } from "./closure";
import { isCrOpen } from "./control";
import { executionStats, isLessonComplete, requiredReportPeriod } from "./execution";
import { isRiskComplete } from "./planning";
import { isStakeholderComplete } from "./stakeholders";
import type {
  ActaFormData,
  BaselineId,
  ChangeReadiness,
  ChangeRequest,
  Closure,
  Incident,
  Meeting,
  Approach,
  CostBaseline,
  FirstInput,
  InputStatus,
  MandatoryInput,
  Phase,
  PhaseId,
  Project,
  Impediment,
  Lesson,
  PerformanceReport,
  QuestionnaireId,
  ResourcePlan,
  GovernanceThresholds,
  Requirement,
  Risk,
  WpProgress,
  ScheduleBaseline,
  ScopeBaseline,
  Stakeholder,
} from "./types";

// Persistencia provisional en el navegador hasta conectar una base de datos real.
const STORAGE_KEY = "asistente-pm:portfolio:v1";
/** Versión anterior (un solo proyecto): se migra al portafolio. */
const LEGACY_KEY = "asistente-pm:project:v3";
export const actaDraftKey = (projectId: string) => `asistente-pm:${projectId}:acta-draft`;

interface PortfolioState {
  projects: Project[];
  activeId: string | null;
}

function patchInput(p: Project, q: QuestionnaireId, patch: Partial<MandatoryInput>): Project {
  return {
    ...p,
    phases: p.phases.map((ph) => ({
      ...ph,
      mandatory_inputs: ph.mandatory_inputs.map((i) => (i.questionnaire === q ? { ...i, ...patch } : i)),
    })),
  };
}

const setInputStatus = (p: Project, q: QuestionnaireId, status: InputStatus) => patchInput(p, q, { status });

export function findInput(p: Project, q: QuestionnaireId): MandatoryInput | undefined {
  return p.phases.flatMap((ph) => ph.mandatory_inputs).find((i) => i.questionnaire === q);
}

/** Asigna el estado salvo que el insumo se haya completado con archivo (queda Aprobado). */
function patchStatusUnlessFile(p: Project, q: QuestionnaireId, status: InputStatus): Project {
  return setInputStatus(p, q, findInput(p, q)?.source === "archivo" ? "Aprobado" : status);
}

/** Registro con lista de ítems: Aprobado si el PM lo confirmó y todo está completo; si no, En Progreso. */
function registerStatus(p: Project, q: QuestionnaireId, count: number, allComplete: boolean, approved: boolean): InputStatus {
  if (findInput(p, q)?.source === "archivo") return "Aprobado";
  if (approved && count > 0 && allComplete) return "Aprobado";
  return count > 0 ? "En Progreso" : "No Iniciado";
}

const approvedRatio = (ph: Phase) =>
  ph.mandatory_inputs.filter((i) => i.status === "Aprobado").length / ph.mandatory_inputs.length;

/**
 * Recalcula estados derivados después de cada acción:
 * - Estado del Registro de Interesados.
 * - % de Inicio: Campos Acta (70%) + Interesados (30%).
 * - % de Planificación: Σ insumos aprobados / 4 × 100.
 * - % de Ejecución: (% paquetes en ejecución + % entregables completados) / 2.
 * - % de Control: (Mediciones EVM al día + % Incidentes cerrados o atendidos) / 2.
 * - % de Cierre: (Entregables aceptados + Contratos cerrados + Lecciones archivadas) / 3.
 */
function recompute(input: Project): Project {
  const stkComplete = input.stakeholders.every(isStakeholderComplete);
  const stkStatus = registerStatus(input, "registro-interesados", input.stakeholders.length, stkComplete, input.stakeholder_register_approved);
  const riskComplete = input.risks.every(isRiskComplete);
  const riskStatus = registerStatus(input, "registro-riesgos", input.risks.length, riskComplete, !!input.risk_register_approved);

  let p: Project = {
    ...input,
    stakeholder_register_approved: stkStatus === "Aprobado",
    risk_register_approved: riskStatus === "Aprobado",
  };
  p = setInputStatus(p, "registro-interesados", stkStatus);
  p = setInputStatus(p, "registro-riesgos", riskStatus);
  // Registros vivos de Ejecución: quedan "abiertos" (aprobados) con el primer registro.
  const lessonsOpen = p.lessons.some(isLessonComplete);
  p = setInputStatus(p, "lecciones-aprendidas", registerStatus(p, "lecciones-aprendidas", lessonsOpen ? 1 : 0, true, lessonsOpen));
  p = setInputStatus(p, "informe-desempeno", registerStatus(p, "informe-desempeno", p.reports.length, true, true));
  // RTM: aprobada solo con cobertura bidireccional completa.
  const rtmOk = !!p.rtm_approved && p.requirements.every(isRequirementDefined) && coverage(p).complete;
  p = { ...p, rtm_approved: findInput(p, "matriz-trazabilidad")?.source === "archivo" ? p.rtm_approved : rtmOk };
  p = patchStatusUnlessFile(p, "matriz-trazabilidad", rtmOk ? "Aprobado" : p.requirements.length ? "En Progreso" : "No Iniciado");
  // Control
  const evmOk = p.reports.length > 0 && !requiredReportPeriod(p);
  p = patchStatusUnlessFile(p, "registro-evm", evmOk ? "Aprobado" : p.reports.length ? "En Progreso" : "No Iniciado");
  const attended = p.incidents.filter((i) => i.status !== "Abierto").length;
  const incOk = !!p.incident_register_reviewed && attended === p.incidents.length;
  p = patchStatusUnlessFile(p, "registro-incidentes", incOk ? "Aprobado" : p.incidents.length ? "En Progreso" : "No Iniciado");
  const crOk = !!p.change_log_reviewed && !p.change_requests.some(isCrOpen) && !p.replanning;
  p = patchStatusUnlessFile(p, "solicitud-cambio", crOk ? "Aprobado" : p.change_requests.length ? "En Progreso" : "No Iniciado");
  const pctEvm = evmOk ? 1 : 0;
  const pctInc = p.incidents.length ? attended / p.incidents.length : p.incident_register_reviewed ? 1 : 0;
  const control = Math.round(((pctEvm + pctInc) / 2) * 100);
  // Cierre
  const cs = closureStats(p);
  const c = closureOf(p);
  p = patchStatusUnlessFile(p, "aceptacion-entregables", cs.rows.length && cs.accepted === 1 ? "Aprobado" : cs.accepted > 0 ? "En Progreso" : "No Iniciado");
  const contractsOk = c.contracts_confirmed && c.contracts.every(isContractClosed) && isAdminClosed(c);
  p = patchStatusUnlessFile(p, "cierre-contratos", contractsOk ? "Aprobado" : c.contracts.length || c.final_cost ? "En Progreso" : "No Iniciado");
  p = patchStatusUnlessFile(p, "archivo-lecciones", c.lessons_archived ? "Aprobado" : Object.keys(c.lesson_tags).length ? "En Progreso" : "No Iniciado");

  const inicio = calcInicioProgress(p);
  const ejecucion = executionStats(p).progress;

  return {
    ...p,
    phases: p.phases.map((ph) => {
      if (ph.status === "Completada") return { ...ph, progress_percentage: 100 };
      if (ph.status !== "En Progreso") return ph;
      const progress =
        ph.id === "inicio"
          ? inicio
          : ph.id === "ejecucion"
            ? ejecucion
            : ph.id === "control"
              ? control
              : ph.id === "cierre"
                ? closureStats(p).progress
                : Math.round(approvedRatio(ph) * 100);
      return { ...ph, progress_percentage: progress };
    }),
  };
}

/** Una línea base guardada con el cuestionario queda aprobada y reemplaza un archivo previo. */
const asQuestionnaire: Partial<MandatoryInput> = { source: "cuestionario", file_name: undefined, status: "Aprobado" };

/** Aprueba una línea base (si no está congelada) y deja constancia en la bitácora. */
function approveBaseline(p: Project, q: QuestionnaireId, patch: Partial<Project>): Project {
  if (lockInfo(p, q).locked) return p;
  return appendAudit(patchInput({ ...p, ...patch }, q, asQuestionnaire), "Línea base aprobada", "Línea base", q);
}

export interface SyncState {
  /** cloud: base de datos; local: solo este navegador (sin servidor configurado). */
  mode: "cloud" | "local";
  status: "idle" | "saving" | "error" | "conflict";
  message?: string;
}

interface ProjectStore {
  sync: SyncState;
  /** Dueño de cada proyecto (correo), visible para administradores. */
  owners: Record<string, string>;
  me: { id: string; email: string; role: "admin" | "pm" } | null;
  /** Proyectos que existen solo en este navegador y aún no están en la base. */
  localOnly: Project[];
  uploadLocal: () => Promise<void>;
  discardLocal: () => void;
  /** Proyecto activo (el que se está gestionando). */
  project: Project | null;
  /** Portafolio completo. */
  projects: Project[];
  selectProject: (id: string) => void;
  hydrated: boolean;
  /** Crea el proyecto y devuelve su ID. */
  create: (clientName: string, projectName: string) => string;
  /** Registra las carpetas de Google Drive de un proyecto (por ID, no solo el activo). */
  setDriveFolders: (projectId: string, phaseId: PhaseId, folders: { client: string; project: string; phase: string }) => void;
  setApproach: (approach: Approach, firstInput: FirstInput) => void;
  submitActa: (data: ActaFormData) => void;
  signActa: () => void;
  saveStakeholder: (s: Stakeholder) => void;
  removeStakeholder: (id: string) => void;
  approveStakeholderRegister: () => void;
  /** Omite el cuestionario adjuntando el documento (obligatorio para omitir). */
  attachFile: (q: QuestionnaireId, fileName: string, fileUrl?: string) => void;
  saveScope: (scope: ScopeBaseline) => void;
  saveSchedule: (schedule: ScheduleBaseline) => void;
  saveCosts: (costs: CostBaseline) => void;
  saveRisk: (r: Risk) => void;
  removeRisk: (id: string) => void;
  approveRiskRegister: () => void;
  saveLesson: (l: Lesson) => void;
  removeLesson: (id: string) => void;
  saveResources: (r: ResourcePlan) => void;
  setWpProgress: (id: string, progress: WpProgress) => void;
  publishReport: (r: PerformanceReport) => void;
  saveImpediment: (i: Impediment) => void;
  removeImpediment: (id: string) => void;
  setEscalationThreshold: (t: { amount: string; days: string }) => void;
  saveIncident: (i: Incident) => void;
  removeIncident: (id: string) => void;
  reviewIncidentRegister: () => void;
  saveChangeRequest: (cr: ChangeRequest) => void;
  removeChangeRequest: (id: string) => void;
  reviewChangeLog: () => void;
  setPmAuthorityLimit: (l: { amount: string; days: string }) => void;
  /** Cambio aprobado que modifica líneas base: retrocede a Planificación (Replanificación). */
  startReplanning: (crId: string, baselines: BaselineId[]) => void;
  saveClosure: (patch: Partial<Closure>, audit?: [string, string, string, string?]) => void;
  saveRequirement: (r: Requirement) => void;
  removeRequirement: (id: string) => void;
  approveRtm: () => void;
  setGovernanceThresholds: (t: GovernanceThresholds) => void;
  setBacReference: (v: string) => void;
  closeProject: () => void;
  saveChangeReadiness: (c: ChangeReadiness) => void;
  saveMeeting: (m: Meeting) => void;
  removeMeeting: (id: string) => void;
  advancePhase: () => void;
  reset: () => void;
}

const Ctx = createContext<ProjectStore | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PortfolioState>({ projects: [], activeId: null });
  const [hydrated, setHydrated] = useState(false);
  const project = state.projects.find((x) => x.project_id === state.activeId) ?? null;

  /** Actualiza el proyecto activo; con null lo elimina del portafolio; uno nuevo se agrega y queda activo. */
  const setProject = useCallback((u: Project | null | ((p: Project | null) => Project | null)) => {
    setState((s) => {
      const cur = s.projects.find((x) => x.project_id === s.activeId) ?? null;
      const next = typeof u === "function" ? u(cur) : u;
      if (next === cur) return s;
      if (!next) return { projects: s.projects.filter((x) => x.project_id !== s.activeId), activeId: null };
      const exists = s.projects.some((x) => x.project_id === next.project_id);
      return {
        projects: exists ? s.projects.map((x) => (x.project_id === next.project_id ? next : x)) : [...s.projects, next],
        activeId: next.project_id,
      };
    });
  }, []);

  const selectProject = useCallback((id: string) => setState((s) => (s.projects.some((x) => x.project_id === id) ? { ...s, activeId: id } : s)), []);

  const [sync, setSync] = useState<SyncState>({ mode: "local", status: "idle" });
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [me, setMe] = useState<ProjectStore["me"]>(null);
  const [localOnly, setLocalOnly] = useState<Project[]>([]);
  const versions = useRef<Record<string, number>>({});
  const synced = useRef<Record<string, string>>({});
  const inFlight = useRef<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latest = useRef<PortfolioState>(state);
  latest.current = state;
  const cacheKey = me ? `${STORAGE_KEY}:${me.id}` : STORAGE_KEY;

  const readPortfolio = (key: string): PortfolioState | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as PortfolioState) : null;
    } catch {
      return null;
    }
  };
  const readLegacy = (): Project[] => {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      return raw ? [JSON.parse(raw) as Project] : [];
    } catch {
      return [];
    }
  };

  // Carga inicial: base de datos si está disponible; si no, solo este navegador.
  useEffect(() => {
    (async () => {
      let remote: {
        me: { id: string; email: string; role: "admin" | "pm" };
        projects: { data: Project; version: number; owner_email: string }[];
      } | null = null;
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (res.ok) remote = await res.json();
      } catch {
        /* sin servidor */
      }
      if (remote) {
        const server = remote.projects.map((x) => recompute(normalizeProject(x.data)));
        remote.projects.forEach((x, i) => {
          versions.current[x.data.project_id] = x.version;
          synced.current[x.data.project_id] = JSON.stringify(server[i]);
        });
        setOwners(Object.fromEntries(remote.projects.map((x) => [x.data.project_id, x.owner_email])));
        setMe(remote.me);
        const cached = readPortfolio(`${STORAGE_KEY}:${remote.me.id}`);
        const ids = new Set(server.map((x) => x.project_id));
        const candidates = [...(cached?.projects ?? []), ...(readPortfolio(STORAGE_KEY)?.projects ?? []), ...readLegacy()];
        const seen = new Set<string>();
        setLocalOnly(
          candidates
            .filter((x) => !ids.has(x.project_id) && !seen.has(x.project_id) && seen.add(x.project_id))
            .map((x) => recompute(normalizeProject(x))),
        );
        setState({ projects: server, activeId: cached?.activeId && ids.has(cached.activeId) ? cached.activeId : null });
        setSync({ mode: "cloud", status: "idle" });
      } else {
        const st = readPortfolio(STORAGE_KEY);
        if (st) setState({ projects: st.projects.map((x) => recompute(normalizeProject(x))), activeId: st.activeId });
        else {
          const legacy = readLegacy().map((x) => recompute(normalizeProject(x)));
          if (legacy.length) setState({ projects: legacy, activeId: legacy[0].project_id });
        }
        setSync({ mode: "local", status: "idle" });
      }
      setHydrated(true);
    })();
  }, []);

  /** Envía un proyecto a la base (un envío a la vez por proyecto). */
  const pushProject = useCallback(async (id: string) => {
    if (inFlight.current[id]) return;
    const p = latest.current.projects.find((x) => x.project_id === id);
    if (!p) return;
    const json = JSON.stringify(p);
    if (synced.current[id] === json) return;
    inFlight.current[id] = true;
    setSync((s) => ({ ...s, status: "saving", message: undefined }));
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: p, version: versions.current[id] ?? 0 }),
      });
      const body = (await res.json().catch(() => ({}))) as { version?: number; owner_email?: string; data?: Project; error?: string };
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (res.ok && body.version) {
        versions.current[id] = body.version;
        synced.current[id] = json;
        if (body.owner_email) setOwners((o) => ({ ...o, [id]: o[id] ?? body.owner_email! }));
        setSync({ mode: "cloud", status: "idle" });
      } else if (res.status === 409 && body.data && body.version) {
        const fresh = recompute(normalizeProject(body.data));
        versions.current[id] = body.version;
        synced.current[id] = JSON.stringify(fresh);
        setState((s) => ({ ...s, projects: s.projects.map((x) => (x.project_id === id ? fresh : x)) }));
        setSync({ mode: "cloud", status: "conflict", message: "Otro usuario actualizó este proyecto: se cargó la versión más reciente. Revisa y repite tu último cambio." });
      } else {
        setSync({ mode: "cloud", status: "error", message: body.error ?? "No se pudo guardar en la base. Tus cambios siguen en este navegador." });
      }
    } catch {
      setSync({ mode: "cloud", status: "error", message: "Sin conexión con la base. Tus cambios siguen en este navegador y se reintentarán." });
      timers.current[id] = setTimeout(() => pushProject(id), 10_000);
    } finally {
      inFlight.current[id] = false;
    }
    // Si hubo más cambios mientras se guardaba, se envían ahora.
    const after = latest.current.projects.find((x) => x.project_id === id);
    if (after && synced.current[id] !== JSON.stringify(after) && versions.current[id]) setTimeout(() => pushProject(id), 50);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(state));
    } catch {
      /* ignorar */
    }
    if (sync.mode !== "cloud") return;
    for (const p of state.projects) {
      if (synced.current[p.project_id] === JSON.stringify(p)) continue;
      clearTimeout(timers.current[p.project_id]);
      timers.current[p.project_id] = setTimeout(() => pushProject(p.project_id), 700);
    }
    // Proyectos eliminados del portafolio: baja lógica en la base.
    const ids = new Set(state.projects.map((x) => x.project_id));
    for (const id of Object.keys(versions.current)) {
      if (ids.has(id)) continue;
      delete versions.current[id];
      delete synced.current[id];
      fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    }
  }, [state, hydrated, sync.mode, cacheKey, pushProject]);

  const uploadLocal = useCallback(async () => {
    const pending = [...localOnly];
    const failed: Project[] = [];
    for (const p of pending) {
      const res = await fetch(`/api/projects/${encodeURIComponent(p.project_id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: p, version: 0 }),
      }).catch(() => null);
      const body = res ? ((await res.json().catch(() => ({}))) as { version?: number; owner_email?: string }) : {};
      if (res?.ok && body.version) {
        versions.current[p.project_id] = body.version;
        synced.current[p.project_id] = JSON.stringify(p);
        setOwners((o) => ({ ...o, [p.project_id]: body.owner_email ?? me?.email ?? "" }));
        setState((s) => ({ ...s, projects: [...s.projects.filter((x) => x.project_id !== p.project_id), p] }));
      } else failed.push(p);
    }
    setLocalOnly(failed);
    if (failed.length === 0) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignorar */
      }
    }
    setSync({ mode: "cloud", status: failed.length ? "error" : "idle", message: failed.length ? `${failed.length} proyecto(s) no se pudieron subir.` : undefined });
  }, [localOnly, me]);

  const discardLocal = useCallback(() => {
    setLocalOnly([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignorar */
    }
  }, []);

  const mutate = useCallback((fn: (p: Project) => Project) => {
    setProject((p) => (p ? recompute(fn(p)) : p));
  }, []);

  const create = useCallback(
    (client: string, name: string) => {
      const p = createProject(client, name);
      setProject(recompute(appendAudit(p, "Proyecto creado", "Proyecto", p.project_id, `${p.client_name} · ${p.project_name}`)));
      return p.project_id;
    },
    [],
  );

  const setDriveFolders = useCallback(
    (projectId: string, phaseId: PhaseId, f: { client: string; project: string; phase: string }) =>
      setState((s) => ({
        ...s,
        projects: s.projects.map((x) =>
          x.project_id !== projectId
            ? x
            : { ...x, drive_folder: { client_url: f.client, project_url: f.project, phases: { ...(x.drive_folder?.phases ?? {}), [phaseId]: f.phase } } },
        ),
      })),
    [],
  );

  const setApproach = useCallback(
    (approach: Approach, first_input: FirstInput) =>
      mutate((p) => appendAudit({ ...p, approach, first_input }, "Enfoque detectado", "Enfoque", approach.type, `${first_input.file_name} → ${approach.detected_from}`)),
    [mutate],
  );

  const submitActa = useCallback(
    (data: ActaFormData) =>
      mutate((p) =>
        lockInfo(p, "acta-constitucion").locked
          ? p
          : appendAudit(
              patchInput({ ...p, acta: data }, "acta-constitucion", { source: "cuestionario", file_name: undefined, status: "Pendiente de Firma" }),
              "Borrador generado",
              "Acta de Constitución",
              "acta-constitucion",
            ),
      ),
    [mutate],
  );

  const signActa = useCallback(
    () => mutate((p) => appendAudit(setInputStatus(p, "acta-constitucion", "Aprobado"), "Firma del Patrocinador registrada", "Acta de Constitución", "acta-constitucion")),
    [mutate],
  );

  const saveStakeholder = useCallback(
    (s: Stakeholder) =>
      mutate((p) => {
        const exists = p.stakeholders.some((x) => x.stakeholder_id === s.stakeholder_id);
        return {
          ...patchInput(p, "registro-interesados", { source: "cuestionario", file_name: undefined }),
          stakeholders: exists
            ? p.stakeholders.map((x) => (x.stakeholder_id === s.stakeholder_id ? s : x))
            : [...p.stakeholders, s],
        };
      }),
    [mutate],
  );

  const removeStakeholder = useCallback(
    (id: string) => mutate((p) => ({ ...p, stakeholders: p.stakeholders.filter((x) => x.stakeholder_id !== id) })),
    [mutate],
  );

  const approveStakeholderRegister = useCallback(
    () => mutate((p) => appendAudit({ ...p, stakeholder_register_approved: true }, "Registro aprobado", "Registro de Interesados", "registro-interesados")),
    [mutate],
  );

  const attachFile = useCallback(
    (q: QuestionnaireId, fileName: string, fileUrl?: string) =>
      mutate((p) =>
        lockInfo(p, q).locked
          ? p
          : appendAudit(
              patchInput(p, q, {
                source: "archivo",
                file_name: fileName,
                file_url: fileUrl,
                // El Acta cargada sigue requiriendo la confirmación de firma del Patrocinador.
                status: q === "acta-constitucion" ? "Pendiente de Firma" : "Aprobado",
              }),
              "Cuestionario omitido con documento",
              "Insumo",
              q,
              fileName,
            ),
      ),
    [mutate],
  );

  const saveScope = useCallback(
    (scope: ScopeBaseline) => mutate((p) => approveBaseline(p, "linea-base-alcance", { scope })),
    [mutate],
  );
  const saveSchedule = useCallback(
    (schedule: ScheduleBaseline) => mutate((p) => approveBaseline(p, "linea-base-cronograma", { schedule })),
    [mutate],
  );
  const saveCosts = useCallback(
    (costs: CostBaseline) => mutate((p) => approveBaseline(p, "linea-base-costos", { costs })),
    [mutate],
  );

  const saveRisk = useCallback(
    (r: Risk) =>
      mutate((p) => {
        const exists = p.risks.some((x) => x.risk_id === r.risk_id);
        return {
          ...patchInput(p, "registro-riesgos", { source: "cuestionario", file_name: undefined }),
          risks: exists ? p.risks.map((x) => (x.risk_id === r.risk_id ? r : x)) : [...p.risks, r],
        };
      }),
    [mutate],
  );
  const removeRisk = useCallback(
    (id: string) => mutate((p) => ({ ...p, risks: p.risks.filter((x) => x.risk_id !== id) })),
    [mutate],
  );
  const approveRiskRegister = useCallback(
    () => mutate((p) => appendAudit({ ...p, risk_register_approved: true }, "Registro aprobado", "Registro de Riesgos", "registro-riesgos")),
    [mutate],
  );
  const saveRequirement = useCallback(
    (r: Requirement) =>
      mutate((p) =>
        lockInfo(p, "matriz-trazabilidad").locked
          ? p
          : { ...patchInput(p, "matriz-trazabilidad", { source: "cuestionario", file_name: undefined }), requirements: upsert(p.requirements, r, (x) => x.id) },
      ),
    [mutate],
  );
  const removeRequirement = useCallback(
    (id: string) =>
      mutate((p) =>
        // Un requisito regulatorio o legal es innegociable: no se elimina.
        lockInfo(p, "matriz-trazabilidad").locked || p.requirements.find((x) => x.id === id)?.regulatory
          ? p
          : { ...p, requirements: p.requirements.filter((x) => x.id !== id) },
      ),
    [mutate],
  );
  const approveRtm = useCallback(
    () =>
      mutate((p) =>
        coverage(p).complete && p.requirements.every(isRequirementDefined)
          ? appendAudit({ ...p, rtm_approved: true }, "RTM aprobada (cobertura bidireccional completa)", "Línea base", "matriz-trazabilidad", `${p.requirements.length} requisitos`)
          : p,
      ),
    [mutate],
  );
  const setGovernanceThresholds = useCallback(
    (t: GovernanceThresholds) =>
      mutate((p) =>
        appendAudit({ ...p, governance_thresholds: t }, "Umbrales de gobernanza actualizados", "Gobernanza", "governance_thresholds", `Tolerancia ${t.cost_tolerance_percentage}% · Umbral ${t.cost_escalation_threshold_percentage}%`),
      ),
    [mutate],
  );
  const setBacReference = useCallback((v: string) => mutate((p) => appendAudit({ ...p, bac_reference: v }, "BAC de referencia registrado", "Gobernanza", "bac_reference", v)), [mutate]);

  const upsert = <T,>(list: T[], item: T, key: (x: T) => string) =>
    list.some((x) => key(x) === key(item)) ? list.map((x) => (key(x) === key(item) ? item : x)) : [...list, item];

  const saveLesson = useCallback(
    (l: Lesson) =>
      mutate((p) => ({
        ...patchInput(p, "lecciones-aprendidas", { source: "cuestionario", file_name: undefined }),
        lessons: upsert(p.lessons, l, (x) => x.id),
      })),
    [mutate],
  );
  const removeLesson = useCallback((id: string) => mutate((p) => ({ ...p, lessons: p.lessons.filter((x) => x.id !== id) })), [mutate]);
  const saveResources = useCallback(
    (resources: ResourcePlan) =>
      mutate((p) => appendAudit(patchInput({ ...p, resources }, "asignacion-recursos", asQuestionnaire), "Asignación formalizada", "Asignación de Recursos", "asignacion-recursos", `Acordado con ${resources.agreed_with}`)),
    [mutate],
  );
  const setWpProgress = useCallback(
    (id: string, progress: WpProgress) =>
      mutate((p) => {
        if (p.closure?.closed_at) return p;
        const stamped = progress.status === "Completado" ? { ...progress, qc_recorded_at: new Date().toISOString() } : progress;
        const next = { ...p, wp_progress: { ...p.wp_progress, [id]: stamped } };
        return progress.status === "Completado"
          ? appendAudit(next, "Verificado por Control de Calidad", "Paquete de trabajo", id, `${progress.qc_verified_by} · fecha declarada ${progress.qc_date}`)
          : next;
      }),
    [mutate],
  );
  const publishReport = useCallback(
    (r: PerformanceReport) =>
      mutate((p) =>
        // Un informe publicado es inmutable: no se reescribe.
        p.reports.some((x) => x.id === r.id)
          ? p
          : appendAudit(
              { ...patchInput(p, "informe-desempeno", { source: "cuestionario", file_name: undefined }), reports: [...p.reports, r] },
              "Informe publicado",
              "Informe de Desempeño",
              r.id,
              `Periodo ${r.period} · PV ${r.pv} · EV ${r.ev} · AC ${r.ac}`,
            ),
      ),
    [mutate],
  );
  const saveImpediment = useCallback(
    (i: Impediment) => mutate((p) => ({ ...p, impediments: upsert(p.impediments, i, (x) => x.id) })),
    [mutate],
  );
  const removeImpediment = useCallback(
    (id: string) => mutate((p) => ({ ...p, impediments: p.impediments.filter((x) => x.id !== id) })),
    [mutate],
  );
  const setEscalationThreshold = useCallback(
    (t: { amount: string; days: string }) => mutate((p) => ({ ...p, escalation_threshold: t })),
    [mutate],
  );

  const saveIncident = useCallback(
    (i: Incident) =>
      mutate((p) => {
        const prev = p.incidents.find((x) => x.id === i.id);
        const next = { ...patchInput(p, "registro-incidentes", { source: "cuestionario", file_name: undefined }), incidents: upsert(p.incidents, i, (x) => x.id) };
        return i.status === "Resuelto" && prev?.status !== "Resuelto"
          ? appendAudit(next, "Incidente resuelto", "Incidente", i.id, i.resolution)
          : next;
      }),
    [mutate],
  );
  const removeIncident = useCallback((id: string) => mutate((p) => ({ ...p, incidents: p.incidents.filter((x) => x.id !== id) })), [mutate]);
  const reviewIncidentRegister = useCallback(() => mutate((p) => ({ ...p, incident_register_reviewed: true })), [mutate]);
  const saveChangeRequest = useCallback(
    (cr: ChangeRequest) =>
      mutate((p) => {
        const prev = p.change_requests.find((x) => x.id === cr.id);
        // Una decisión registrada no se reescribe (sello de tiempo del sistema).
        if (prev?.decided_at && (prev.decision !== cr.decision || prev.decision_date !== cr.decision_date)) return p;
        const decidedNow = !!cr.decision && !prev?.decided_at && cr.status !== "En análisis" && cr.status !== "Pendiente de decisión";
        const stamped = decidedNow ? { ...cr, decided_at: new Date().toISOString() } : cr;
        const next = { ...patchInput(p, "solicitud-cambio", { source: "cuestionario", file_name: undefined }), change_requests: upsert(p.change_requests, stamped, (x) => x.id) };
        if (decidedNow)
          return appendAudit(next, `Cambio ${cr.decision.toLowerCase()} (${cr.route === "PM" ? "PM" : "CCB / Gobernanza"})`, "Solicitud de Cambio", cr.id, `Fecha declarada ${cr.decision_date} · ${cr.governance ? `${cr.governance.cost_deviation_pct}% del BAC · ${cr.governance.band}` : ""}`);
        if (cr.status === "Resuelto sin cambio de línea base" && prev?.status !== cr.status)
          return appendAudit(next, "Resuelto sin cambio de línea base", "Solicitud de Cambio", cr.id, cr.alternative_detail);
        return next;
      }),
    [mutate],
  );
  const removeChangeRequest = useCallback(
    (id: string) => mutate((p) => ({ ...p, change_requests: p.change_requests.filter((x) => x.id !== id) })),
    [mutate],
  );
  const reviewChangeLog = useCallback(() => mutate((p) => ({ ...p, change_log_reviewed: true })), [mutate]);
  const setPmAuthorityLimit = useCallback((l: { amount: string; days: string }) => mutate((p) => ({ ...p, pm_authority_limit: l })), [mutate]);
  const startReplanning = useCallback(
    (crId: string, baselines: BaselineId[]) =>
      mutate((p) => {
        if (baselines.length === 0 || p.replanning) return p;
        const resume = p.current_phase;
        const planIdx = p.phases.findIndex((x) => x.id === "planificacion");
        const resumeIdx = p.phases.findIndex((x) => x.id === resume);
        let next: Project = {
          ...p,
          replanning: { cr_id: crId, resume_phase: resume, baselines },
          current_phase: "planificacion",
          phases: p.phases.map((ph, i) =>
            i === planIdx ? { ...ph, status: "En Progreso" } : i > planIdx && i <= resumeIdx ? { ...ph, status: "Bloqueada" } : ph,
          ),
        };
        for (const b of baselines) next = setInputStatus(next, b, "En Progreso");
        // Si cambia el alcance, la RTM debe volver a trazarse.
        if (baselines.includes("linea-base-alcance")) next = { ...next, rtm_approved: false };
        return appendAudit(next, "Retroceso a Planificación (Replanificación)", "Solicitud de Cambio", crId, baselines.join(", "));
      }),
    [mutate],
  );
  const saveClosure = useCallback(
    (patch: Partial<Closure>, audit?: [string, string, string, string?]) =>
      mutate((p) => {
        if (p.closure?.closed_at) return p;
        const next = { ...p, closure: { ...closureOf(p), ...patch } };
        return audit ? appendAudit(next, audit[0], audit[1], audit[2], audit[3] ?? "") : next;
      }),
    [mutate],
  );
  const closeProject = useCallback(
    () =>
      mutate((p) => {
        const ph = p.phases.find((x) => x.id === "cierre");
        if (p.current_phase !== "cierre" || !ph || !ph.mandatory_inputs.every((i) => i.status === "Aprobado")) return p;
        return appendAudit(
          {
            ...p,
            closure: { ...closureOf(p), closed_at: new Date().toISOString() },
            phases: p.phases.map((x) => (x.id === "cierre" ? { ...x, status: "Completada" } : x)),
          },
          "Proyecto cerrado",
          "Proyecto",
          p.project_id,
        );
      }),
    [mutate],
  );
  const saveChangeReadiness = useCallback((c: ChangeReadiness) => mutate((p) => ({ ...p, change_readiness: c })), [mutate]);
  const saveMeeting = useCallback((m: Meeting) => mutate((p) => ({ ...p, meetings: upsert(p.meetings, m, (x) => x.id) })), [mutate]);
  const removeMeeting = useCallback((id: string) => mutate((p) => ({ ...p, meetings: p.meetings.filter((x) => x.id !== id) })), [mutate]);

  const advancePhase = useCallback(
    () =>
      mutate((p) => {
        if (!canAdvance(p)) return p;
        // Fin de la replanificación: vuelve a la fase desde la que se retrocedió.
        if (p.replanning && p.current_phase === "planificacion") {
          const planIdx = p.phases.findIndex((x) => x.id === "planificacion");
          const resumeIdx = p.phases.findIndex((x) => x.id === p.replanning!.resume_phase);
          return appendAudit({
            ...p,
            replanning: undefined,
            current_phase: p.replanning.resume_phase,
            phases: p.phases.map((ph, i) =>
              i >= planIdx && i < resumeIdx ? { ...ph, status: "Completada" } : i === resumeIdx ? { ...ph, status: "En Progreso" } : ph,
            ),
          }, "Plan actualizado aprobado; fin de la replanificación", "Fase", "planificacion");
        }
        const idx = p.phases.findIndex((x) => x.id === p.current_phase);
        const next = p.phases[idx + 1];
        if (!next) return p;
        return appendAudit({
          ...p,
          execution_started_at: next.id === "ejecucion" ? new Date().toISOString() : p.execution_started_at,
          current_phase: next.id,
          phases: p.phases.map((ph, i) =>
            i === idx ? { ...ph, status: "Completada" } : i === idx + 1 ? { ...ph, status: "En Progreso" } : ph,
          ),
        }, `Fase completada y aprobada (${p.phases[idx].phase_name} → ${next.phase_name})`, "Fase", p.phases[idx].id);
      }),
    [mutate],
  );

  /** Elimina el proyecto activo del portafolio (y sus borradores). */
  const reset = useCallback(() => {
    try {
      const id = state.activeId;
      if (id) Object.keys(localStorage).filter((k) => k.startsWith(`asistente-pm:${id}:`)).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignorar */
    }
    setProject(null);
  }, [state.activeId, setProject]);

  const value = useMemo(
    () => ({
      sync,
      owners,
      me,
      localOnly,
      uploadLocal,
      discardLocal,
      setDriveFolders,
      project,
      projects: state.projects,
      selectProject,
      hydrated,
      create,
      setApproach,
      submitActa,
      signActa,
      saveStakeholder,
      removeStakeholder,
      approveStakeholderRegister,
      attachFile,
      saveScope,
      saveSchedule,
      saveCosts,
      saveRisk,
      removeRisk,
      approveRiskRegister,
      saveLesson,
      removeLesson,
      saveResources,
      setWpProgress,
      publishReport,
      saveImpediment,
      removeImpediment,
      setEscalationThreshold,
      saveIncident,
      removeIncident,
      reviewIncidentRegister,
      saveChangeRequest,
      removeChangeRequest,
      reviewChangeLog,
      setPmAuthorityLimit,
      startReplanning,
      saveClosure,
      closeProject,
      saveChangeReadiness,
      saveMeeting,
      removeMeeting,
      saveRequirement,
      removeRequirement,
      approveRtm,
      setGovernanceThresholds,
      setBacReference,
      advancePhase,
      reset,
    }),
    [
      sync,
      owners,
      me,
      localOnly,
      uploadLocal,
      discardLocal,
      setDriveFolders,
      project,
      state.projects,
      selectProject,
      hydrated,
      create,
      setApproach,
      submitActa,
      signActa,
      saveStakeholder,
      removeStakeholder,
      approveStakeholderRegister,
      attachFile,
      saveScope,
      saveSchedule,
      saveCosts,
      saveRisk,
      removeRisk,
      approveRiskRegister,
      saveLesson,
      removeLesson,
      saveResources,
      setWpProgress,
      publishReport,
      saveImpediment,
      removeImpediment,
      setEscalationThreshold,
      saveIncident,
      removeIncident,
      reviewIncidentRegister,
      saveChangeRequest,
      removeChangeRequest,
      reviewChangeLog,
      setPmAuthorityLimit,
      startReplanning,
      saveClosure,
      closeProject,
      saveChangeReadiness,
      saveMeeting,
      removeMeeting,
      saveRequirement,
      removeRequirement,
      approveRtm,
      setGovernanceThresholds,
      setBacReference,
      advancePhase,
      reset,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject(): ProjectStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject debe usarse dentro de <ProjectProvider>");
  return ctx;
}

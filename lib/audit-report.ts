import { verifyAuditChain } from "./audit";
import { deliverableRows } from "./closure";
import { latestReport } from "./execution";
import { crGovernance, evmGovernance } from "./governance";
import { coverage } from "./rtm";
import type { Project } from "./types";

/**
 * Resumen exportable con la estructura del checklist de auditoría
 * (governance_thresholds, compliance_rule, deliverable_verification, audit_integrity),
 * ampliado con trazabilidad y gestión del conocimiento.
 */
export function buildAuditReport(p: Project) {
  const last = latestReport(p);
  const evmGov = last ? evmGovernance(last, p) : null;
  const decided = p.change_requests.filter((c) => c.governance);
  const chain = verifyAuditChain(p.audit_log);
  const cov = coverage(p);
  const knowledge = Object.values(p.closure?.knowledge ?? {});
  const regulatoryCrs = p.change_requests.filter((c) => c.regulatory);
  return {
    project_id: p.project_id,
    project_name: p.project_name,
    client_name: p.client_name,
    generated_at: new Date().toISOString(),
    governance_thresholds: {
      cost_tolerance_percentage: p.governance_thresholds.cost_tolerance_percentage,
      cost_escalation_threshold_percentage: p.governance_thresholds.cost_escalation_threshold_percentage,
      escalation_mandatory: !!evmGov?.escalation_mandatory || decided.some((c) => c.governance?.escalation_mandatory && c.status === "Pendiente de decisión"),
      latest_evm_cost_deviation: evmGov ? { period: last!.period, cv_percentage: evmGov.cost_deviation_pct, band: evmGov.band } : null,
      change_requests: decided.map((c) => ({ change_id: c.id, ...c.governance, route: c.route, decision: c.decision })),
      pending_change_requests: p.change_requests.filter((c) => !c.governance).map((c) => ({ change_id: c.id, preview: crGovernance(c, p) })),
    },
    compliance_rule: {
      is_regulatory_legal: regulatoryCrs.length > 0 || p.requirements.some((r) => r.regulatory),
      ccb_rejection_allowed: false,
      action: "Obligatory_Baseline_Adjustment_And_Escalation",
      regulatory_requirements: p.requirements.filter((r) => r.regulatory).map((r) => r.id),
      regulatory_change_requests: regulatoryCrs.map((c) => ({ change_id: c.id, decision: c.decision, baselines_adjusted: c.baselines_affected, escalated: c.route === "CCB" })),
    },
    deliverable_verification: deliverableRows(p).map((d) => ({
      deliverable: d.name,
      quality_inspected_internally: d.verified,
      client_formal_acceptance: d.accepted,
      rtm_id_link: d.acceptance?.rtm_ids ?? [],
      acceptance_recorded_at: d.acceptance?.recorded_at ?? null,
    })),
    requirements_traceability: {
      total_requirements: p.requirements.length,
      rtm_approved: !!p.rtm_approved,
      uncovered_requirements: cov.uncovered.map((r) => r.id),
      untraced_work_packages: cov.untraced.map((w) => `${w.code} ${w.name}`),
    },
    knowledge_management: {
      explicit_lessons: knowledge.filter((k) => k.type === "Explícito").length,
      tacit_lessons: knowledge.filter((k) => k.type === "Tácito").length,
      opa_repository: p.closure?.opa_folder || null,
      tacit_transfers: knowledge.filter((k) => k.type === "Tácito").map((k) => ({ holder: k.holder, receiver: k.receiver, method: k.method, date: k.date })),
    },
    audit_integrity: {
      retroactive_approval_prevented: true,
      timestamp_immutable: p.audit_log[p.audit_log.length - 1]?.at ?? null,
      chain_verified: chain.ok,
      broken_at_entry: chain.brokenAt,
      entries: p.audit_log.length,
      storage: "browser_localStorage_tamper_evident",
    },
  };
}

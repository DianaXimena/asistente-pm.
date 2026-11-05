"use client";

import Link from "next/link";
import clsx from "clsx";
import { Download, LayoutDashboard, ShieldAlert, ShieldCheck } from "lucide-react";
import { verifyAuditChain } from "@/lib/audit";
import { buildAuditReport } from "@/lib/audit-report";
import type { Project } from "@/lib/types";
import { RequireProject } from "../RequireProject";
import { btnPrimary, btnSecondary, card } from "../ui";
import { Hint } from "../wizard";

export function AuditScreen() {
  return <RequireProject>{(p) => <Audit project={p} />}</RequireProject>;
}

function Audit({ project }: { project: Project }) {
  const chain = verifyAuditChain(project.audit_log);
  const download = () => {
    const blob = new Blob([JSON.stringify(buildAuditReport(project), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${project.project_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      <section className={clsx(card, "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
        <div className="flex items-start gap-3">
          {chain.ok ? <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-semaforo-verde" /> : <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-semaforo-rojo" />}
          <div>
            <p className="text-sm font-semibold text-kruger-dark">
              {chain.ok ? "Integridad verificada" : `Bitácora alterada a partir de la entrada #${chain.brokenAt}`}
            </p>
            <p className="text-xs text-kruger-dark/60">{project.audit_log.length} entradas encadenadas · solo se agregan, nunca se editan ni se borran</p>
          </div>
        </div>
        <button type="button" className={btnPrimary} onClick={download}>
          <Download className="h-4 w-4" /> Exportar auditoría (JSON)
        </button>
      </section>
      <Hint>
        Las marcas de tiempo son del sistema y no se pueden editar. Cada entrada incluye una huella encadenada con la anterior: cualquier modificación se detecta.
        Mientras los datos estén en el navegador, la bitácora es a prueba de alteraciones (las detecta), no inalterable; la inmutabilidad real llegará con el servidor.
      </Hint>
      <section className={card}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-kruger-dark/55">
              <tr>
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="py-2 pr-3 font-semibold">Sello del sistema</th>
                <th className="py-2 pr-3 font-semibold">Evento</th>
                <th className="py-2 pr-3 font-semibold">Detalle</th>
                <th className="py-2 font-semibold">Huella</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kruger-gray/20">
              {[...project.audit_log].reverse().map((e) => (
                <tr key={e.seq} className={chain.brokenAt !== null && e.seq >= chain.brokenAt ? "bg-semaforo-rojo/5" : ""}>
                  <td className="py-2 pr-3 tabular-nums text-kruger-dark/60">{e.seq}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs text-kruger-dark/70">{new Date(e.at).toLocaleString("es-EC")}</td>
                  <td className="py-2 pr-3 text-kruger-dark">
                    <span className="font-medium">{e.action}</span>
                    <span className="block text-xs text-kruger-dark/55">
                      {e.entity} · {e.entity_id}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-kruger-dark/70">{e.detail}</td>
                  <td className="py-2 font-mono text-[10px] text-kruger-dark/50">{e.hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Link href="/" className={btnSecondary}>
        <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
      </Link>
    </div>
  );
}

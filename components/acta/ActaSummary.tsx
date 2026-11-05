"use client";

import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, LayoutDashboard, Pencil } from "lucide-react";
import { AUTHORITY_OPTIONS, formatDate, formatMoney } from "@/lib/acta";
import type { ActaFormData } from "@/lib/types";

/** Pantalla 5: Resumen y enlace a Drive. */
export function ActaSummary({ data, onEdit }: { data: ActaFormData; onEdit: () => void }) {
  const authority = AUTHORITY_OPTIONS.find((o) => o.value === data.pm_authority);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-semaforo-verde/30 bg-white p-5 shadow-card print:hidden">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-semaforo-verde" />
        <div>
          <p className="text-sm font-semibold text-kruger-dark">Borrador del Acta generado</p>
          <p className="mt-1 text-sm text-kruger-dark/65">
            Estado del insumo: <strong>Pendiente de Firma del Sponsor</strong>. El progreso de Inicio se actualizó en el
            Dashboard.
          </p>
        </div>
      </div>

      <article className="rounded-2xl border border-kruger-gray/25 bg-white p-6 shadow-card sm:p-8 print:border-0 print:shadow-none">
        <header className="border-b-4 border-kruger-orange pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-kruger-orange">Borrador</p>
          <h2 className="mt-1 text-2xl font-semibold text-kruger-dark">Acta de Constitución del Proyecto</h2>
        </header>

        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <Item title="Propósito y caso de negocio" wide>
            {data.business_case}
          </Item>
          <Item title="Director del Proyecto">{data.pm_name}</Item>
          <Item title="Nivel de autoridad">
            {authority ? (
              <>
                {authority.title}
                <span className="block text-xs text-kruger-dark/55">{authority.detail}</span>
              </>
            ) : (
              "—"
            )}
          </Item>
          <Item title="Presupuesto inicial">{formatMoney(data.budget)}</Item>
          <Item title="Fecha límite">{formatDate(data.deadline)}</Item>
          {data.milestones.length > 0 && (
            <Item title="Hitos principales" wide>
              <ul className="space-y-1">
                {data.milestones.map((m, i) => (
                  <li key={i} className="flex justify-between gap-4 border-b border-kruger-gray/15 pb-1 last:border-0">
                    <span>{m.name}</span>
                    <span className="shrink-0 text-kruger-dark/60">{formatDate(m.date)}</span>
                  </li>
                ))}
              </ul>
            </Item>
          )}
          <Item title="Patrocinador (Sponsor)">
            {data.sponsor_name}
            <span className="block text-xs text-kruger-dark/55">{data.sponsor_role}</span>
          </Item>
          <Item title="Correo para aprobación">{data.sponsor_email}</Item>
        </dl>

        <div className="mt-8 grid gap-8 border-t border-kruger-gray/20 pt-6 sm:grid-cols-2">
          <Signature label="Firma del Patrocinador" name={data.sponsor_name} />
          <Signature label="Firma del Director del Proyecto" name={data.pm_name} />
        </div>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden">
        <button
          type="button"
          disabled
          title="La integración con Google Drive aún no está conectada"
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-kruger-gray px-5 py-2.5 text-sm font-semibold text-white"
        >
          <ExternalLink className="h-4 w-4" /> Exportar y Abrir Plantilla en Google Drive
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] uppercase">Próximamente</span>
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-kruger-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-kruger-orange-dark"
        >
          <Download className="h-4 w-4" /> Descargar PDF
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-kruger-gray/40 bg-white px-5 py-2.5 text-sm font-medium text-kruger-dark transition hover:border-kruger-orange"
        >
          <Pencil className="h-4 w-4" /> Editar respuestas
        </button>
        <Link
          href="/proyecto"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-kruger-gray/40 bg-white px-5 py-2.5 text-sm font-medium text-kruger-dark transition hover:border-kruger-orange"
        >
          <LayoutDashboard className="h-4 w-4" /> Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}

function Item({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-kruger-dark/55">{title}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm text-kruger-dark">{children}</dd>
    </div>
  );
}

function Signature({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <div className="h-12 border-b border-kruger-dark/40" />
      <p className="mt-2 text-sm font-medium text-kruger-dark">{name}</p>
      <p className="text-xs text-kruger-dark/55">{label}</p>
    </div>
  );
}

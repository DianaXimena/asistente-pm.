"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";
import type { AssistantMessage } from "@/lib/assistant";
import { ProgressBar } from "./ProgressBar";

const shell =
  "group relative block w-full overflow-hidden rounded-2xl bg-gradient-to-br from-kruger-orange to-kruger-orange-dark p-6 text-left text-white shadow-card outline-none transition sm:p-8";
const interactive = "hover:shadow-lg focus-visible:ring-4 focus-visible:ring-kruger-orange/40";

/** Tarjeta central del Asistente: lee los estados y propone la siguiente acción. */
export function AssistantCard({ data, onAdvance, onClose }: { data: AssistantMessage; onAdvance: () => void; onClose?: () => void }) {
  const cta = data.cta;
  const body = (
    <>
      <span aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-white/5" />
      <span className="relative block">
        <span className="flex items-center gap-2 text-sm font-medium text-white/90">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-4 w-4" />
          </span>
          Asistente PM
        </span>

        <span className="mt-5 block text-xl font-semibold leading-snug sm:text-2xl">{data.message}</span>

        <span className="mt-6 block max-w-md">
          <span className="mb-2 flex justify-between text-xs font-medium text-white/85">
            <span>Progreso de {data.phaseName}</span>
            <span className="tabular-nums">{data.progress}%</span>
          </span>
          <ProgressBar value={data.progress} tone="white" label={`Progreso de ${data.phaseName}`} />
        </span>

        {cta && (
          <span className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-kruger-orange shadow-sm transition group-hover:gap-3">
              <ClipboardList className="h-4 w-4" />
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </span>
            {cta.hint && <span className="text-xs text-white/85">{cta.hint}</span>}
          </span>
        )}
      </span>
    </>
  );

  if (cta?.kind === "link")
    return (
      <Link href={cta.href} className={`${shell} ${interactive}`}>
        {body}
      </Link>
    );
  if (cta?.kind === "advance" || cta?.kind === "close")
    return (
      <button type="button" onClick={cta.kind === "close" ? onClose : onAdvance} className={`${shell} ${interactive}`}>
        {body}
      </button>
    );
  return <section className={shell}>{body}</section>;
}

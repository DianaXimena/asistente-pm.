import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";
import type { AssistantMessage } from "@/lib/assistant";
import { ProgressBar } from "./ProgressBar";

/** Tarjeta central del Asistente: lee los estados y propone la siguiente acción. */
export function AssistantCard({ data }: { data: AssistantMessage }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm font-medium text-white/90">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Sparkles className="h-4 w-4" />
        </span>
        Asistente PM
      </div>

      <p className="mt-5 text-xl font-semibold leading-snug sm:text-2xl">{data.message}</p>

      <div className="mt-6 max-w-md">
        <div className="mb-2 flex justify-between text-xs font-medium text-white/85">
          <span>Progreso de {data.phaseName}</span>
          <span className="tabular-nums">{data.progress}%</span>
        </div>
        <ProgressBar value={data.progress} tone="white" label={`Progreso de ${data.phaseName}`} />
      </div>

      {data.questionnaire && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-kruger-orange shadow-sm transition group-hover:gap-3">
            <ClipboardList className="h-4 w-4" />
            Llenar cuestionario
            <ArrowRight className="h-4 w-4" />
          </span>
          <span className="text-xs text-white/85">
            {data.questionnaire.questions} preguntas · una por pantalla · ~3 min
          </span>
        </div>
      )}
    </>
  );

  const className =
    "group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-kruger-orange to-kruger-orange-dark p-6 text-white shadow-card sm:p-8";

  return data.href ? (
    <Link
      href={data.href}
      className={`${className} outline-none transition hover:shadow-lg focus-visible:ring-4 focus-visible:ring-kruger-orange/40`}
    >
      <Decoration />
      <div className="relative">{body}</div>
    </Link>
  ) : (
    <section className={className}>
      <Decoration />
      <div className="relative">{body}</div>
    </section>
  );
}

function Decoration() {
  return (
    <>
      <span aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-white/5" />
    </>
  );
}

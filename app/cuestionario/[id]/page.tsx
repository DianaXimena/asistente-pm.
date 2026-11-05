import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QUESTIONNAIRES } from "@/lib/questionnaires";
import type { QuestionnaireId } from "@/lib/types";

export function generateStaticParams() {
  // El Acta tiene su propia ruta con el flujo completo.
  return Object.keys(QUESTIONNAIRES)
    .filter((id) => id !== "acta-constitucion" && id !== "registro-interesados")
    .map((id) => ({ id }));
}

// Marcador de posición: el flujo paso a paso de cada cuestionario se construye en la siguiente iteración.
export default async function QuestionnairePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = QUESTIONNAIRES[id as QuestionnaireId];
  if (!q) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-kruger-orange hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
      </Link>
      <div className="mt-6 rounded-2xl border border-kruger-gray/25 bg-white p-8 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-kruger-dark/55">Cuestionario · {q.hint}</p>
        <h1 className="mt-2 text-2xl font-semibold text-kruger-dark">{q.title} ({q.label})</h1>
        <p className="mt-4 text-sm text-kruger-dark/70">
          El flujo guiado (una pregunta por pantalla) está en construcción.
        </p>
      </div>
    </main>
  );
}

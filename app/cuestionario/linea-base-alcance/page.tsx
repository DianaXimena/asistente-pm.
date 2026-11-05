import type { Metadata } from "next";
import { ScopeWizard } from "@/components/planning/ScopeWizard";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Línea Base del Alcance · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Planificación" title="Línea Base del Alcance" subtitle="Enunciado del alcance, EDT y Diccionario de la EDT." wide>
      <ScopeWizard />
    </QuestionnaireLayout>
  );
}

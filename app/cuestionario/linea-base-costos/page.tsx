import type { Metadata } from "next";
import { CostWizard } from "@/components/planning/CostWizard";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Línea Base de Costos · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Planificación" title="Línea Base de Costos" subtitle="Estimaciones, reserva de contingencia y reserva de gestión." wide>
      <CostWizard />
    </QuestionnaireLayout>
  );
}

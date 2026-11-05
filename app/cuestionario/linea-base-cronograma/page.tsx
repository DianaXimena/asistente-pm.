import type { Metadata } from "next";
import { ScheduleWizard } from "@/components/planning/ScheduleWizard";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Línea Base del Cronograma · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Planificación" title="Línea Base del Cronograma" subtitle="Duraciones, dependencias, fechas y ruta crítica." wide>
      <ScheduleWizard />
    </QuestionnaireLayout>
  );
}

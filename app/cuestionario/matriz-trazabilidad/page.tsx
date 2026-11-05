import type { Metadata } from "next";
import { RtmScreen } from "@/components/planning/RtmScreen";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Matriz de Trazabilidad de Requisitos · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout
      phase="Planificación"
      title="Matriz de Trazabilidad de Requisitos (RTM)"
      subtitle="Requisitos con su origen y criterio de aceptación, trazados hacia adelante (requisito → EDT) y hacia atrás (EDT → requisito → objetivo)."
      wide
    >
      <RtmScreen />
    </QuestionnaireLayout>
  );
}

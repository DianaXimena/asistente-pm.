import type { Metadata } from "next";
import { ResourcesWizard } from "@/components/execution/ResourcesWizard";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Asignación de Recursos · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Ejecución" title="Asignación de Recursos" subtitle="Equipo del proyecto, matriz RACI por paquete de trabajo y formalización." wide>
      <ResourcesWizard />
    </QuestionnaireLayout>
  );
}

import type { Metadata } from "next";
import { ContractsScreen } from "@/components/closure/ClosureScreens";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Cierre de Contratos y Administrativo · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Cierre" title="Cierre de Contratos y Administrativo" subtitle="Cierre de adquisiciones, cierre financiero y liberación de recursos." wide>
      <ContractsScreen />
    </QuestionnaireLayout>
  );
}

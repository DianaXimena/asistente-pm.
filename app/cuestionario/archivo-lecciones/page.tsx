import type { Metadata } from "next";
import { LessonsArchiveScreen } from "@/components/closure/ClosureScreens";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Archivo de Lecciones Aprendidas · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Cierre" title="Archivo de Lecciones Aprendidas" subtitle="Del registro vivo al Activo de los Procesos de la Organización (OPA)." wide>
      <LessonsArchiveScreen />
    </QuestionnaireLayout>
  );
}

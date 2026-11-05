import type { Metadata } from "next";
import { LessonsRegister } from "@/components/execution/LessonsRegister";
import { QuestionnaireLayout } from "@/components/QuestionnaireLayout";

export const metadata: Metadata = { title: "Registro de Lecciones Aprendidas · Asistente PM" };

export default function Page() {
  return (
    <QuestionnaireLayout phase="Ejecución" title="Registro de Lecciones Aprendidas" subtitle="Registro vivo: qué funcionó, qué no y qué recomiendas." wide>
      <LessonsRegister />
    </QuestionnaireLayout>
  );
}

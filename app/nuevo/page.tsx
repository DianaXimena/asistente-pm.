import { redirect } from "next/navigation";

// La creación de proyectos ahora vive en el portafolio ("Nuevo Proyecto").
export default function NuevoPage() {
  redirect("/");
}

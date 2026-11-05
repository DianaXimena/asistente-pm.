import type { Metadata } from "next";
import { UsersAdmin } from "@/components/auth/UsersAdmin";

export const metadata: Metadata = { title: "Usuarios · Asistente PM" };

export default function UsuariosPage() {
  return <UsersAdmin />;
}

import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "Proyecto · Asistente PM" };

export default function ProyectoPage() {
  return <Dashboard />;
}

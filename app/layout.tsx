import type { Metadata } from "next";
import { ProjectProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistente PM",
  description: "Asistente paso a paso para Project Managers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans">
        <ProjectProvider>{children}</ProjectProvider>
      </body>
    </html>
  );
}

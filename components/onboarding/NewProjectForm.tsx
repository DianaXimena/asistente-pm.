"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useProject } from "@/lib/store";
import { Field, inputClass } from "../acta/fields";
import { btnPrimary, card } from "../ui";

/** Paso 0: el asistente arranca pidiendo cliente y nombre del proyecto. */
export function NewProjectForm() {
  const { project, hydrated, create } = useProject();
  const router = useRouter();
  const [client, setClient] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (hydrated && project) router.replace(project.approach ? "/" : "/nuevo/insumo");
  }, [hydrated, project, router]);

  const valid = client.trim().length > 1 && name.trim().length > 1;

  return (
    <form
      noValidate
      className={card}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return setTouched(true);
        create(client, name);
        router.push("/nuevo/insumo");
      }}
    >
      <div className="space-y-5">
        <Field label="Nombre del cliente" htmlFor="client" error={touched && client.trim().length < 2 ? "Ingresa el nombre del cliente." : undefined}>
          <input id="client" autoFocus className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} />
        </Field>
        <Field label="Nombre del proyecto" htmlFor="project" error={touched && name.trim().length < 2 ? "Ingresa el nombre del proyecto." : undefined}>
          <input id="project" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      <div className="mt-8 flex justify-end border-t border-kruger-gray/20 pt-6">
        <button type="submit" className={btnPrimary} aria-disabled={!valid}>
          Crear proyecto <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

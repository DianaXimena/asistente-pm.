import type { Project } from "@/lib/types";

/** Sugerencias de responsables: PM del Acta e interesados registrados. */
export function PeopleList({ project }: { project: Project }) {
  const names = new Set<string>();
  if (project.acta?.pm_name) names.add(project.acta.pm_name);
  project.stakeholders.forEach((s) => s.name && names.add(s.name));
  return (
    <datalist id="people">
      {[...names].map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  );
}

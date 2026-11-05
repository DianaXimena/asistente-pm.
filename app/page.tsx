import { Dashboard } from "@/components/Dashboard";
import { mockProject } from "@/lib/mock-project";

export default function HomePage() {
  return <Dashboard project={mockProject} />;
}

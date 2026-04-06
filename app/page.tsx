import { Dashboard } from "@/components/dashboard";
import { getKnowledgeBase } from "@/lib/knowledge";

export default async function Home() {
  const knowledge = await getKnowledgeBase();

  return <Dashboard knowledge={knowledge} />;
}

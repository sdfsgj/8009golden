import disclaimers from "@/data/knowledge/disclaimers.json";
import drugs from "@/data/knowledge/drugs.json";
import symptoms from "@/data/knowledge/symptoms.json";
import triageRules from "@/data/knowledge/triage_rules.json";

export type Symptom = (typeof symptoms)[number];
export type Drug = (typeof drugs)[number];
export type TriageRule = (typeof triageRules)[number];
export type Disclaimer = (typeof disclaimers)[number];

export type KnowledgeBase = {
  symptoms: Symptom[];
  drugs: Drug[];
  triageRules: TriageRule[];
  disclaimers: Disclaimer[];
  featuredSymptoms: Symptom[];
  featuredDrugs: Drug[];
  emergencyRules: TriageRule[];
};

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  const featuredSymptoms = symptoms.slice(0, 6);
  const featuredDrugs = drugs.slice(0, 5);
  const emergencyRules = triageRules.filter((rule) => rule.severity === "emergency");

  return {
    symptoms,
    drugs,
    triageRules,
    disclaimers,
    featuredSymptoms,
    featuredDrugs,
    emergencyRules
  };
}

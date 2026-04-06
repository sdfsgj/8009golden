import type { Disclaimer, Drug, KnowledgeBase, Symptom, TriageRule } from "@/lib/knowledge";

export type QueryType = "risk_triage" | "drug_info" | "symptom_understanding" | "general";

export type DemoResponse = {
  queryType: QueryType;
  title: string;
  summary: string;
  matchedSymptoms: Symptom[];
  matchedDrugs: Drug[];
  matchedRules: TriageRule[];
  keyFindings: string[];
  suggestedActions: string[];
  notes: string[];
  safetyReminder: string;
  disclaimers: Disclaimer[];
};

const queryTypeLabels: Record<QueryType, string> = {
  risk_triage: "Risk Triage",
  drug_info: "Drug Explanation",
  symptom_understanding: "Symptom Understanding",
  general: "General Medical Support"
};

const generalSafety =
  "If symptoms are severe, getting worse, or involve breathing difficulty, chest pain, confusion, or dehydration, seek urgent medical care.";

const symptomKeywordMap: Record<string, string[]> = {
  fever: ["fever", "temperature", "hot", "发烧", "发热"],
  cough: ["cough", "咳嗽"],
  sore_throat: ["sore throat", "throat pain", "喉咙痛", "咽喉痛"],
  headache: ["headache", "migraine", "头痛", "头疼"],
  shortness_of_breath: ["shortness of breath", "breathing difficulty", "can't breathe", "喘不过气", "呼吸困难"],
  chest_pain: ["chest pain", "chest pressure", "tight chest", "胸痛", "胸口疼"],
  abdominal_pain: ["abdominal pain", "stomach pain", "belly pain", "腹痛", "肚子痛"],
  nausea_vomiting: ["nausea", "vomit", "vomiting", "throwing up", "恶心", "呕吐"],
  diarrhea: ["diarrhea", "loose stool", "watery stool", "腹泻", "拉肚子"],
  fatigue: ["fatigue", "tired", "weak", "乏力", "疲劳"],
  rash: ["rash", "skin rash", "red spots", "皮疹", "红疹"],
  dizziness: ["dizziness", "vertigo", "faint", "lightheaded", "头晕", "眩晕"],
  runny_nose: ["runny nose", "stuffy nose", "nasal congestion", "流鼻涕", "鼻塞"],
  back_pain: ["back pain", "backache", "腰背痛", "背痛"],
  allergic_reaction: ["allergy", "allergic reaction", "facial swelling", "过敏", "过敏反应"]
};

const drugKeywordMap: Record<string, string[]> = {
  acetaminophen: ["acetaminophen", "tylenol", "paracetamol", "对乙酰氨基酚", "扑热息痛"],
  ibuprofen: ["ibuprofen", "advil", "motrin", "布洛芬"],
  amoxicillin: ["amoxicillin", "amoxil", "阿莫西林"],
  omeprazole: ["omeprazole", "prilosec", "奥美拉唑"],
  cetirizine: ["cetirizine", "zyrtec", "西替利嗪"],
  albuterol: ["albuterol", "ventolin", "proair", "salbutamol", "沙丁胺醇"],
  metformin: ["metformin", "glucophage", "二甲双胍"],
  amlodipine: ["amlodipine", "norvasc", "氨氯地平"],
  lisinopril: ["lisinopril", "prinivil", "zestril", "赖诺普利"],
  famotidine: ["famotidine", "pepcid", "法莫替丁"]
};

const riskKeywords = [
  "emergency",
  "urgent",
  "immediately",
  "right now",
  "should i wait",
  "wait and see",
  "can't breathe",
  "severe",
  "persistent",
  "pressure",
  "confusion",
  "fainting",
  "blood",
  "急诊",
  "严重",
  "马上",
  "要不要等"
];

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function includesAny(query: string, terms: string[]) {
  return terms.some((term) => query.includes(term));
}

function findSymptoms(query: string, symptoms: Symptom[]) {
  return symptoms.filter((symptom) => {
    const terms = [
      symptom.name.toLowerCase(),
      symptom.name_zh.toLowerCase(),
      ...symptom.aliases.map((alias) => alias.toLowerCase()),
      ...(symptomKeywordMap[symptom.id] ?? [])
    ];

    return includesAny(query, terms);
  });
}

function findDrugs(query: string, drugs: Drug[]) {
  return drugs.filter((drug) => {
    const terms = [
      drug.generic_name.toLowerCase(),
      drug.name_zh.toLowerCase(),
      ...drug.brand_examples.map((brand) => brand.toLowerCase()),
      ...(drugKeywordMap[drug.id] ?? [])
    ];

    return includesAny(query, terms);
  });
}

function matchRules(query: string, matchedSymptoms: Symptom[], triageRules: TriageRule[]) {
  const symptomIds = new Set(matchedSymptoms.map((symptom) => symptom.id));

  return triageRules.filter((rule) => {
    const triggerMatch = rule.logic === "any"
      ? rule.triggers_any.some((trigger) => symptomIds.has(trigger))
      : rule.triggers_any.every((trigger) => symptomIds.has(trigger));

    const qualifierMatch =
      !("qualifiers" in rule) ||
      !Array.isArray(rule.qualifiers) ||
      rule.qualifiers.some((qualifier) => query.includes(qualifier.toLowerCase()));

    const comboMatch =
      !("combo_groups" in rule) ||
      !Array.isArray(rule.combo_groups) ||
      rule.combo_groups.some((group) => group.every((item) => symptomIds.has(item)));

    return triggerMatch && qualifierMatch && comboMatch;
  });
}

function dedupe(items: string[]) {
  return [...new Set(items)];
}

export function createDemoResponse(query: string, knowledge: KnowledgeBase): DemoResponse {
  const normalizedQuery = normalize(query);
  const matchedSymptoms = findSymptoms(normalizedQuery, knowledge.symptoms);
  const matchedDrugs = findDrugs(normalizedQuery, knowledge.drugs);
  const matchedRules = matchRules(normalizedQuery, matchedSymptoms, knowledge.triageRules);
  const emergencyMatch = matchedRules.some((rule) => rule.severity === "emergency");
  const drugIntent = matchedDrugs.length > 0;
  const symptomIntent = matchedSymptoms.length > 0;
  const riskIntent = emergencyMatch || includesAny(normalizedQuery, riskKeywords);

  let queryType: QueryType = "general";

  if (riskIntent && symptomIntent) {
    queryType = "risk_triage";
  } else if (drugIntent) {
    queryType = "drug_info";
  } else if (symptomIntent) {
    queryType = "symptom_understanding";
  }

  const keyFindings = dedupe([
    ...matchedSymptoms.slice(0, 3).map(
      (symptom) => `${symptom.name}: ${symptom.plain_description}`
    ),
    ...matchedDrugs.slice(0, 2).map(
      (drug) => `${drug.generic_name}: commonly used for ${drug.used_for.slice(0, 2).join(" and ")}`
    ),
    ...matchedRules.slice(0, 2).map((rule) => rule.message)
  ]);

  const suggestedActions = dedupe([
    ...matchedSymptoms.slice(0, 2).map((symptom) => symptom.suggested_action),
    ...matchedRules.slice(0, 2).map((rule) => rule.action),
    ...(queryType === "general"
      ? [
          "Clarify the main symptom, the duration, and whether there are any emergency warning signs before giving a stronger recommendation."
        ]
      : [])
  ]);

  const notes = dedupe([
    ...matchedDrugs.slice(0, 2).map(
      (drug) => `${drug.generic_name}: watch for ${drug.common_side_effects.join(", ")}.`
    ),
    ...matchedSymptoms.slice(0, 2).flatMap((symptom) =>
      symptom.warning_signs.slice(0, 2).map(
        (warning) => `${symptom.name}: warning sign includes ${warning}.`
      )
    )
  ]);

  const summary =
    queryType === "risk_triage"
      ? "This question matches a higher-risk symptom pattern, so the response should stay short, safety-first, and action-oriented."
      : queryType === "drug_info"
        ? "This question is mainly about medication explanation, so the answer should focus on uses, benefits, side effects, and precautions."
        : queryType === "symptom_understanding"
          ? "This question is mainly about symptom understanding, so the answer should explain likely common causes and reasonable next steps."
          : "This question is broad, so the system should ask for more detail while keeping strong medical safety boundaries.";

  const safetyReminder =
    matchedRules[0]?.message ??
    matchedSymptoms.flatMap((symptom) => symptom.warning_signs)[0] ??
    generalSafety;

  return {
    queryType,
    title: queryTypeLabels[queryType],
    summary,
    matchedSymptoms,
    matchedDrugs,
    matchedRules,
    keyFindings: keyFindings.length > 0 ? keyFindings : ["No direct symptom or drug match found. The user may need to describe the problem more clearly."],
    suggestedActions:
      suggestedActions.length > 0
        ? suggestedActions
        : ["Advise the user to describe the symptom, timing, severity, and any red-flag signs."],
    notes:
      notes.length > 0
        ? notes
        : ["Keep the response educational only and avoid diagnosis or prescribing."],
    safetyReminder,
    disclaimers: knowledge.disclaimers.slice(0, 2)
  };
}

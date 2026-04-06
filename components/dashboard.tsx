"use client";

import { useMemo, useState, useTransition } from "react";

import { createDemoResponse } from "@/lib/demo";
import type { KnowledgeBase } from "@/lib/knowledge";

type DashboardProps = {
  knowledge: KnowledgeBase;
};

type AudienceMode = "patient" | "clinician";

type HistoryItem = {
  id: string;
  query: string;
  caseType: string;
  localResponse: ReturnType<typeof createDemoResponse>;
  aiAnswer?: string;
  aiModel?: string;
  aiError?: string;
};

const sampleCaseMeta = [
  {
    label: "Symptom case",
    expected: "Symptom understanding",
    queryType: "symptom_understanding",
    prompt: "I have had fever, cough, and sore throat for three days. What should I do?"
  },
  {
    label: "Drug case",
    expected: "Drug explanation",
    queryType: "drug_info",
    prompt: "What is amoxicillin used for? Does it have side effects?"
  },
  {
    label: "Urgent case",
    expected: "Risk triage",
    queryType: "risk_triage",
    prompt: "I have chest pain and shortness of breath. Should I wait and see?"
  }
] as const;

function createHistoryItem(
  query: string,
  knowledge: KnowledgeBase,
  caseType = "Live query"
): HistoryItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query,
    caseType,
    localResponse: createDemoResponse(query, knowledge)
  };
}

function buildFinalValidatedAnswer(item: HistoryItem, mode: AudienceMode) {
  const local = item.localResponse;

  if (mode === "clinician") {
    const matched = [
      ...local.matchedSymptoms.map((symptom) => symptom.name),
      ...local.matchedDrugs.map((drug) => drug.generic_name),
      ...local.matchedRules.map((rule) => rule.title)
    ]
      .slice(0, 4)
      .join(", ");

    return [
      `Route: ${local.title}.`,
      `Matched evidence: ${matched || "No strong direct match"}.`,
      `Immediate action: ${local.suggestedActions[0]}`,
      `Safety validation: ${local.safetyReminder}`
    ].join(" ");
  }

  return [
    local.summary,
    `Suggested next step: ${local.suggestedActions[0]}`,
    `Safety note: ${local.safetyReminder}`
  ].join(" ");
}

export function Dashboard({ knowledge }: DashboardProps) {
  const initialHistory = useMemo(
    () =>
      sampleCaseMeta.map((item) =>
        createHistoryItem(item.prompt, knowledge, item.label)
      ),
    [knowledge]
  );

  const [query, setQuery] = useState<string>(sampleCaseMeta[2].prompt);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [selectedId, setSelectedId] = useState(initialHistory[2]?.id ?? "");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("patient");
  const [isPending, startTransition] = useTransition();

  const selectedItem =
    history.find((item) => item.id === selectedId) ??
    history[history.length - 1] ??
    initialHistory[0];

  const active = selectedItem.localResponse;

  const stats = [
    { label: "Symptoms", value: knowledge.symptoms.length },
    { label: "Drugs", value: knowledge.drugs.length },
    { label: "Triage Rules", value: knowledge.triageRules.length },
    { label: "Disclaimers", value: knowledge.disclaimers.length }
  ];

  const evidenceItems = [
    ...active.matchedSymptoms.map((symptom) => ({
      label: `Symptom card: ${symptom.name}`,
      source: symptom.source.name,
      url: symptom.source.url
    })),
    ...active.matchedDrugs.map((drug) => ({
      label: `Drug source: ${drug.generic_name}`,
      source: drug.source.name,
      url: drug.source.url
    })),
    ...active.matchedRules.map((rule) => ({
      label: `Triage rule: ${rule.title}`,
      source: rule.source.name,
      url: rule.source.url
    }))
  ];

  function handleAnalyze() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const item = createHistoryItem(trimmed, knowledge);
    setHistory((current) => [...current, item]);
    setSelectedId(item.id);
  }

  function handleEnhanceWithAI() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const item = createHistoryItem(trimmed, knowledge);
    setHistory((current) => [...current, item]);
    setSelectedId(item.id);

    startTransition(async () => {
      try {
        const result = await fetch("/api/ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ query: trimmed })
        });

        const data = (await result.json()) as {
          answer?: string;
          error?: string;
          model?: string;
        };

        setHistory((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  aiAnswer: result.ok ? data.answer ?? "" : undefined,
                  aiModel: result.ok ? data.model ?? "" : undefined,
                  aiError: result.ok ? undefined : data.error ?? "Request failed."
                }
              : entry
          )
        );
      } catch (error) {
        setHistory((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  aiError:
                    error instanceof Error ? error.message : "Unknown request error."
                }
              : entry
          )
        );
      }
    });
  }

  const finalValidatedAnswer = buildFinalValidatedAnswer(selectedItem, audienceMode);

  return (
    <main className="page-shell">
      <div className="topbar">
        <div>
          <span className="brand-kicker">MediGuide</span>
          <h1 className="brand-title">Patient-facing medical guidance, organized for clarity and safety.</h1>
        </div>
        <div className="topbar-badge">Clinical communication support prototype</div>
      </div>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Medical Information Assistant</span>
          <h2>Symptom understanding, medication explanation, and risk-aware response support.</h2>
          <p>
            MediGuide is designed to help users understand common symptoms, medicines,
            and urgent warning signs in a safer and more structured way than a general
            chatbot.
          </p>
          <p className="agentic-line">
            Agentic workflow: classify - retrieve/ground - generate - safety validate.
          </p>
          <div className="hero-actions">
            <a href="#demo" className="primary-link">
              Open assistant
            </a>
            <a href="#knowledge" className="secondary-link">
              Review knowledge base
            </a>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-head">
            <span className="panel-label">System status</span>
            <span className="live-dot">Operational</span>
          </div>
          <div className="hero-highlight">
            <p className="hero-highlight-label">Primary use case</p>
            <strong>Patient education and clinician-friendly communication support</strong>
            <span>Local triage logic, medicine knowledge, and AI-assisted response drafting</span>
          </div>
          <div className="hero-evidence-note">
            Curated from public medical education sources for classroom prototype use.
          </div>
          <div className="stats-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="workflow-strip">
        <article className="workflow-card">
          <span className="workflow-step">01</span>
          <h3>Capture the query</h3>
          <p>Users can describe symptoms, ask about a medicine, or raise an urgent concern.</p>
        </article>
        <article className="workflow-card">
          <span className="workflow-step">02</span>
          <h3>Classify and ground</h3>
          <p>The local engine maps the question to symptoms, drugs, and triage rules.</p>
        </article>
        <article className="workflow-card">
          <span className="workflow-step">03</span>
          <h3>Return validated output</h3>
          <p>The assistant presents findings, suggested action, and a final safety-reviewed answer.</p>
        </article>
      </section>

      <section className="section" id="demo">
        <div className="section-heading">
          <span className="eyebrow">Assistant Workspace</span>
          <h2>Conversation and structured response review</h2>
          <p>Use the left panel to submit a health question and the right panel to inspect the assistant output.</p>
        </div>

        <div className="demo-layout">
          <section className="qa-panel">
            <div className="composer-card">
              <div className="composer-header">
                <div>
                  <span className="panel-label">Query intake</span>
                  <h3>Enter a patient-style question</h3>
                </div>
                <span className="composer-tag">Input module</span>
              </div>

              <label className="prompt-label" htmlFor="demo-query">
                Prompt
              </label>
              <textarea
                id="demo-query"
                className="query-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Describe a symptom, ask about a drug, or test a high-risk case."
                rows={5}
              />

              <div className="prompt-list">
                {sampleCaseMeta.map((item) => (
                  <button
                    key={item.prompt}
                    type="button"
                    className="prompt-chip"
                    onClick={() => setQuery(item.prompt)}
                  >
                    {item.prompt}
                  </button>
                ))}
              </div>

              <div className="hero-actions">
                <button
                  type="button"
                  className="secondary-link button-reset"
                  onClick={handleAnalyze}
                  disabled={query.trim().length === 0}
                >
                  Run local analysis
                </button>
                <button
                  type="button"
                  className="primary-link button-reset"
                  onClick={handleEnhanceWithAI}
                  disabled={isPending || query.trim().length === 0}
                >
                  {isPending ? "Generating..." : "Generate assistant response"}
                </button>
              </div>
            </div>

            <div className="history-header">
              <span className="panel-label">Interaction history</span>
              <p className="history-caption">These seeded cases also work as a small classroom test set.</p>
            </div>
            <div className="history-list">
              {history.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`history-item${item.id === selectedId ? " history-item-active" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="history-item-index">#{index + 1}</span>
                  <span className="history-item-body">
                    <span className="history-item-text">{item.query}</span>
                    <span className="history-item-meta">
                      {item.caseType} - {item.localResponse.title}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="answer-panel">
            <div className="answer-header">
              <div>
                <span className="panel-label">Response review</span>
                <h3>AI Assistant Response</h3>
              </div>
              <div className="answer-header-controls">
                <div className="audience-toggle">
                  <button
                    type="button"
                    className={`toggle-chip${audienceMode === "patient" ? " toggle-chip-active" : ""}`}
                    onClick={() => setAudienceMode("patient")}
                  >
                    Patient-friendly
                  </button>
                  <button
                    type="button"
                    className={`toggle-chip${audienceMode === "clinician" ? " toggle-chip-active" : ""}`}
                    onClick={() => setAudienceMode("clinician")}
                  >
                    Clinician-friendly
                  </button>
                </div>
                <span
                  className={
                    active.queryType === "risk_triage"
                      ? "severity severity-emergency"
                      : "severity severity-info"
                  }
                >
                  {active.queryType.replaceAll("_", " ")}
                </span>
              </div>
            </div>

            <article className="chat-bubble chat-bubble-user">
              <span className="chat-role">User</span>
              <p>{selectedItem.query}</p>
            </article>

            <div className="answer-block-grid">
              <div className="answer-block">
                <h4>Local triage result</h4>
                <p>{active.summary}</p>
                <ul className="answer-list">
                  {active.keyFindings.slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="answer-block">
                <h4>AI-enhanced explanation</h4>
                {selectedItem.aiAnswer ? (
                  <>
                    {selectedItem.aiModel ? (
                      <p className="supporting-copy">Model: {selectedItem.aiModel}</p>
                    ) : null}
                    <pre className="ai-output">{selectedItem.aiAnswer}</pre>
                  </>
                ) : selectedItem.aiError ? (
                  <p className="error-copy">{selectedItem.aiError}</p>
                ) : (
                  <p className="supporting-copy">
                    Generate assistant response to add the LLM layer on top of the local rule-based analysis.
                  </p>
                )}
              </div>

              <div className="answer-block">
                <h4>Final validated answer</h4>
                <p>{finalValidatedAnswer}</p>
              </div>

              <div className="answer-block">
                <h4>Suggested action</h4>
                <ul className="answer-list">
                  {active.suggestedActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="answer-block answer-block-alert">
                <h4>Safety reminder</h4>
                <p>{active.safetyReminder}</p>
              </div>

              <div className="answer-block">
                <h4>Matched entities</h4>
                <div className="chip-row">
                  {active.matchedSymptoms.map((symptom) => (
                    <span key={symptom.id} className="chip">
                      Symptom: {symptom.name}
                    </span>
                  ))}
                  {active.matchedDrugs.map((drug) => (
                    <span key={drug.id} className="chip">
                      Drug: {drug.generic_name}
                    </span>
                  ))}
                  {active.matchedRules.map((rule) => (
                    <span key={rule.id} className="chip chip-danger">
                      Rule: {rule.title}
                    </span>
                  ))}
                  {active.matchedSymptoms.length === 0 &&
                  active.matchedDrugs.length === 0 &&
                  active.matchedRules.length === 0 ? (
                    <span className="chip">No direct matches yet</span>
                  ) : null}
                </div>
              </div>

              <div className="answer-block">
                <h4>Drug or treatment notes</h4>
                <ul className="answer-list">
                  {active.notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="answer-block">
                <h4>Boundary reminder</h4>
                <ul className="answer-list">
                  {active.disclaimers.map((item) => (
                    <li key={item.id}>{item.message}</li>
                  ))}
                </ul>
              </div>

              <div className="answer-block">
                <h4>Evidence used</h4>
                <details className="evidence-panel">
                  <summary>Show matched knowledge and source links</summary>
                  <div className="evidence-list">
                    {evidenceItems.length > 0 ? (
                      evidenceItems.map((item) => (
                        <a
                          key={`${item.label}-${item.url}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="evidence-item"
                        >
                          <strong>{item.label}</strong>
                          <span>{item.source}</span>
                        </a>
                      ))
                    ) : (
                      <p className="supporting-copy">
                        No grounded source was matched for this query yet.
                      </p>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="section" id="evaluation">
        <div className="section-heading">
          <span className="eyebrow">Evaluation / Testing</span>
          <h2>Representative test cases for classroom review</h2>
          <p>
            These examples are used to check whether the system routes the query correctly,
            grounds the answer in the right source, and preserves safety-first behavior.
          </p>
        </div>
        <div className="evaluation-grid">
          {sampleCaseMeta.map((item) => {
            const result = createDemoResponse(item.prompt, knowledge);
            const matched = result.queryType === item.queryType;

            return (
              <article key={item.label} className="evaluation-card">
                <div className="evaluation-head">
                  <span className="panel-label">{item.label}</span>
                  <span className={matched ? "severity severity-info" : "severity severity-emergency"}>
                    {matched ? "Matched expected route" : "Needs review"}
                  </span>
                </div>
                <p className="evaluation-query">{item.prompt}</p>
                <ul className="answer-list">
                  <li>Expected route: {item.expected}</li>
                  <li>Detected route: {result.title}</li>
                  <li>
                    Grounding hits:{" "}
                    {result.matchedSymptoms.length +
                      result.matchedDrugs.length +
                      result.matchedRules.length}
                  </li>
                  <li>Safety reminder present: {result.safetyReminder ? "Yes" : "No"}</li>
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section" id="knowledge">
        <div className="section-heading">
          <span className="eyebrow">Knowledge Base</span>
          <h2>Featured symptom cards</h2>
          <p>
            A browsable symptom layer that makes the assistant grounding easier to inspect.
            Curated from public medical education sources for classroom prototype use.
          </p>
        </div>
        <div className="card-grid">
          {knowledge.featuredSymptoms.map((symptom) => (
            <article key={symptom.id} className="info-card">
              <div className="card-topline">
                <h3>{symptom.name}</h3>
                <span>{symptom.name_zh}</span>
              </div>
              <p>{symptom.plain_description}</p>
              <div className="chip-row">
                {symptom.common_causes.slice(0, 3).map((cause) => (
                  <span key={cause} className="chip">
                    {cause}
                  </span>
                ))}
              </div>
              <p className="supporting-copy">
                <strong>Suggested action:</strong> {symptom.suggested_action}
              </p>
              <a href={symptom.source.url} target="_blank" rel="noreferrer" className="source-link">
                Source
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Medication Reference</span>
          <h2>Featured drug explanations</h2>
          <p>Each card summarizes common use and precautions, with a stable DailyMed handoff.</p>
        </div>
        <div className="card-grid">
          {knowledge.featuredDrugs.map((drug) => (
            <article key={drug.id} className="info-card drug-card">
              <div className="card-topline">
                <h3>{drug.generic_name}</h3>
                <span>{drug.name_zh}</span>
              </div>
              <p>{drug.how_it_works_simple}</p>
              <p className="supporting-copy">
                <strong>Used for:</strong> {drug.used_for.join(", ")}
              </p>
              <p className="supporting-copy">
                <strong>Watch for:</strong> {drug.common_side_effects.join(", ")}
              </p>
              <a href={drug.source.url} target="_blank" rel="noreferrer" className="source-link">
                Source
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="safety">
        <div className="section-heading">
          <span className="eyebrow">Safety Layer</span>
          <h2>High-priority triage rules</h2>
          <p>Emergency-oriented rules keep the assistant aligned with a safety-first communication boundary.</p>
        </div>
        <div className="triage-list">
          {knowledge.emergencyRules.slice(0, 8).map((rule) => (
            <article key={rule.id} className="triage-card">
              <div className="triage-header">
                <span className="severity severity-emergency">{rule.severity}</span>
                <h3>{rule.title}</h3>
              </div>
              <p>{rule.message}</p>
              <p className="supporting-copy">
                <strong>Action:</strong> {rule.action}
              </p>
              <a href={rule.source.url} target="_blank" rel="noreferrer" className="source-link">
                Source
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

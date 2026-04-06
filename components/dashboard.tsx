"use client";

import { useMemo, useState, useTransition } from "react";

import { createDemoResponse } from "@/lib/demo";
import type { KnowledgeBase } from "@/lib/knowledge";

type DashboardProps = {
  knowledge: KnowledgeBase;
};

type HistoryItem = {
  id: string;
  query: string;
  localResponse: ReturnType<typeof createDemoResponse>;
  aiAnswer?: string;
  aiModel?: string;
  aiError?: string;
};

const samplePrompts = [
  "I have had fever, cough, and sore throat for three days. What should I do?",
  "What is amoxicillin used for? Does it have side effects?",
  "I have chest pain and shortness of breath. Should I wait and see?"
];

function createHistoryItem(query: string, knowledge: KnowledgeBase): HistoryItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query,
    localResponse: createDemoResponse(query, knowledge)
  };
}

export function Dashboard({ knowledge }: DashboardProps) {
  const initialHistory = useMemo(
    () => [createHistoryItem(samplePrompts[2], knowledge)],
    [knowledge]
  );

  const [query, setQuery] = useState(samplePrompts[2]);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [selectedId, setSelectedId] = useState(initialHistory[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedItem =
    history.find((item) => item.id === selectedId) ??
    history[history.length - 1] ??
    initialHistory[0];

  const stats = [
    { label: "Symptoms", value: knowledge.symptoms.length },
    { label: "Drugs", value: knowledge.drugs.length },
    { label: "Triage Rules", value: knowledge.triageRules.length },
    { label: "Disclaimers", value: knowledge.disclaimers.length }
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

  const active = selectedItem.localResponse;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">MediGuide classroom prototype</span>
          <h1>Ask a medical question and present it like a real AI assistant demo.</h1>
          <p>
            The site now supports local classification, AI-enhanced answers, and visible
            chat history so it feels much closer to a final presentation-ready product.
          </p>
          <div className="hero-actions">
            <a href="#demo" className="primary-link">
              Launch demo
            </a>
            <a href="#knowledge" className="secondary-link">
              Browse knowledge base
            </a>
          </div>
        </div>

        <div className="hero-panel">
          <p className="panel-label">Knowledge snapshot</p>
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

      <section className="section" id="demo">
        <div className="section-heading">
          <span className="eyebrow">Interactive Demo</span>
          <h2>Conversation view with structured medical answer</h2>
        </div>

        <div className="demo-layout">
          <section className="qa-panel">
            <label className="prompt-label" htmlFor="demo-query">
              Ask a question
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
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="prompt-chip"
                  onClick={() => setQuery(prompt)}
                >
                  {prompt}
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
                Analyze locally
              </button>
              <button
                type="button"
                className="primary-link button-reset"
                onClick={handleEnhanceWithAI}
                disabled={isPending || query.trim().length === 0}
              >
                {isPending ? "Generating..." : "Generate AI response"}
              </button>
            </div>

            <div className="history-header">
              <span className="panel-label">Chat History</span>
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
                  <span className="history-item-text">{item.query}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="answer-panel">
            <div className="answer-header">
              <div>
                <span className="panel-label">Conversation</span>
                <h3>AI Assistant Response</h3>
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

            <div className="chat-thread">
              <article className="chat-bubble chat-bubble-user">
                <span className="chat-role">User</span>
                <p>{selectedItem.query}</p>
              </article>

              <article className="chat-bubble chat-bubble-assistant">
                <span className="chat-role">Local Demo Engine</span>
                <p>{active.summary}</p>
                <ul className="answer-list">
                  {active.keyFindings.slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              {selectedItem.aiAnswer ? (
                <article className="chat-bubble chat-bubble-ai">
                  <span className="chat-role">
                    AI Assistant {selectedItem.aiModel ? `- ${selectedItem.aiModel}` : ""}
                  </span>
                  <pre className="ai-output">{selectedItem.aiAnswer}</pre>
                </article>
              ) : null}

              {selectedItem.aiError ? (
                <article className="chat-bubble chat-bubble-alert">
                  <span className="chat-role">AI Assistant Error</span>
                  <p className="error-copy">{selectedItem.aiError}</p>
                </article>
              ) : null}
            </div>

            <div className="answer-block-grid">
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
                <h4>Suggested action</h4>
                <ul className="answer-list">
                  {active.suggestedActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="answer-block">
                <h4>Drug or treatment notes</h4>
                <ul className="answer-list">
                  {active.notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="answer-block answer-block-alert">
                <h4>Safety reminder</h4>
                <p>{active.safetyReminder}</p>
              </div>

              <div className="answer-block">
                <h4>Boundary reminder</h4>
                <ul className="answer-list">
                  {active.disclaimers.map((item) => (
                    <li key={item.id}>{item.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="section" id="knowledge">
        <div className="section-heading">
          <span className="eyebrow">Knowledge Base</span>
          <h2>Featured symptom cards</h2>
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
          <span className="eyebrow">Medication</span>
          <h2>Featured drug explanations</h2>
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

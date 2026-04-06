import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createDemoResponse } from "@/lib/demo";
import { getKnowledgeBase } from "@/lib/knowledge";

type AskBody = {
  query?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  const baseURL = process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.com/v1";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing SILICONFLOW_API_KEY on the server." },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as AskBody;
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    const knowledge = await getKnowledgeBase();
    const local = createDemoResponse(query, knowledge);
    const model = process.env.SILICONFLOW_MODEL ?? "openai/gpt-oss-120b";
    const client = new OpenAI({ apiKey, baseURL });

    const context = [
      `Local classifier type: ${local.title}`,
      `Summary: ${local.summary}`,
      `Key findings: ${local.keyFindings.join(" | ")}`,
      `Suggested actions: ${local.suggestedActions.join(" | ")}`,
      `Notes: ${local.notes.join(" | ")}`,
      `Safety reminder: ${local.safetyReminder}`,
      `Boundary reminders: ${local.disclaimers.map((item) => item.message).join(" | ")}`
    ].join("\n");

    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content:
            "You are helping render a classroom medical-information demo. Stay educational, concise, and safety-first. Do not diagnose, prescribe, or claim certainty. Use the provided local knowledge context as grounding. Format the answer in plain text with exactly these section headings: Query Type, Key Findings, Suggested Action, Drug or Treatment Notes, Safety Reminder."
        },
        {
          role: "user",
          content: `User query:\n${query}\n\nLocal knowledge context:\n${context}`
        }
      ]
    });

    return NextResponse.json({
      answer: response.choices[0]?.message?.content ?? "",
      model,
      local
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while calling SiliconFlow.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

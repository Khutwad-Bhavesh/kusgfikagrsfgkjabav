import { callOpenAI } from "./openai";
import { callGemini } from "./gemini";

// provider: "openai" | "gemini". Falls back to DEFAULT_AI_PROVIDER env
// var, then "openai", if not specified by the client.
export async function callAI(provider, system, prompt) {
  const chosen = provider || process.env.DEFAULT_AI_PROVIDER || "openai";

  const raw = chosen === "gemini"
    ? await callGemini(system, prompt)
    : await callOpenAI(system, prompt);

  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return { provider: chosen, data: JSON.parse(clean) };
  } catch (e) {
    throw new Error(
      `${chosen} response could not be parsed as JSON. Raw response started with: "${raw.slice(0, 160)}..."`
    );
  }
}

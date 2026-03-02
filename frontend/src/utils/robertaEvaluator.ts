import robertaDataset, { DatasetItem } from "../data/robertaDataset";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HF_API_TOKEN = import.meta.env.VITE_HF_TOKEN as string | undefined;
const HF_TIMEOUT_MS = 8000;

// RoBERTa model fine-tuned on SQuAD — extracts answers and scores relevance
// between a question and a passage (your candidate answer).
const HF_ROBERTA_URL =
  "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface STARBreakdown {
  situation: number;  // 1–5
  task: number;       // 1–5
  action: number;     // 1–5
  result: number;     // 1–5
  reflection: number; // 1–5
}

export interface EvaluationResult {
  source: "roberta_hf" | "zsl_star" | "zsl_star_fallback";
  matchedQuestion: string | null;
  baseScore: number | null;
  similarity: number;
  score: number;        // 1–5 final blended score
  breakdown: STARBreakdown;
  hfRaw?: number;       // raw RoBERTa confidence, for debugging
  error?: string;       // set when RoBERTa failed and fallback was used
  hrLabel?: string;     // human-readable HR rating label for the score
}

// ---------------------------------------------------------------------------
// HR Score labels — maps 1–5 to your official HR rubric labels
// ---------------------------------------------------------------------------

const HR_LABELS: Record<number, string> = {
  5: "Excellent — Exceeds Standard",
  4: "Very Good — Above Standard",
  3: "Good — Meets Standard",
  2: "Fair — Below Standard",
  1: "Needs Improvement — Unsatisfactory",
};

function getHRLabel(score: number): string {
  return HR_LABELS[Math.max(1, Math.min(5, score))] ?? "Unscored";
}

// ---------------------------------------------------------------------------
// Text normalization helpers
// ---------------------------------------------------------------------------

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/["'`.,()]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeText(s).split(" ").filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const ia = Array.from(a).filter((x) => b.has(x));
  if (ia.length === 0) return 0;
  return ia.length / (a.size + b.size - ia.length);
}

// ---------------------------------------------------------------------------
// Dataset lookup — finds closest question in robertaDataset
// ---------------------------------------------------------------------------

export function findBestMatch(question: string): { item: DatasetItem | null; score: number } {
  const qTokens = tokenSet(question);
  let best: DatasetItem | null = null;
  let bestScore = 0;

  for (const it of robertaDataset) {
    const s = jaccard(qTokens, tokenSet(it.question));
    if (s > bestScore) {
      bestScore = s;
      best = it;
    }
  }

  return { item: best, score: bestScore };
}

// ---------------------------------------------------------------------------
// Path 1 — RoBERTa via HF Inference API
//
// Sends the interview question + candidate answer to deepset/roberta-base-squad2.
// RoBERTa treats the answer as a passage and extracts the most relevant span,
// returning a confidence score (0–1) that the span answers the question.
// That confidence maps to your 1–5 HR rubric scale.
// ---------------------------------------------------------------------------

async function callRoBERTa(
  interviewQuestion: string,
  candidateAnswer: string
): Promise<{ score: number; rawConfidence: number; extractedAnswer: string }> {
  if (!HF_API_TOKEN) throw new Error("VITE_HF_TOKEN is not set in your .env file.");

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), HF_TIMEOUT_MS);

  try {
    const response = await fetch(HF_ROBERTA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          question: interviewQuestion,
          context: candidateAnswer,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error("RoBERTa model is loading on HF servers. Retry in ~20 seconds.");
      }
      const body = await response.text().catch(() => "");
      throw new Error(`RoBERTa HF API error ${response.status}: ${body}`);
    }

    // RoBERTa QA response: { answer: string, score: number, start: number, end: number }
    const data = await response.json();
    const rawConfidence: number = typeof data.score === "number" ? data.score : 0;
    const extractedAnswer: string = typeof data.answer === "string" ? data.answer : "";
    const score = confidenceToScore(rawConfidence);

    return { score, rawConfidence, extractedAnswer };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// Maps RoBERTa confidence (0–1) to HR rubric score (1–5)
function confidenceToScore(confidence: number): number {
  if (confidence >= 0.8) return 5;
  if (confidence >= 0.6) return 4;
  if (confidence >= 0.4) return 3;
  if (confidence >= 0.2) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Path 2 — ZSL STAR Heuristic
//
// Scores the answer locally against your official HR rubric (1–5) across
// all five STAR dimensions. No network required — always available as fallback.
//
// Each dimension is scored independently using signal detection:
//   Strong signals  → higher dimension score
//   Weak/no signals → lower dimension score
//
// Final per-dimension scores map directly to the HR rubric descriptors:
//   5 — Clearly described, specific, measurable, with reflection
//   4 — Clear with minor gaps, organized
//   3 — General, partial, vague result
//   2 — Unclear, vague, no result
//   1 — Absent, off-topic, disorganized
// ---------------------------------------------------------------------------

// Situation signals — maps to HR rubric:
//   5: clearly described with relevant context
//   4: clear with minor missing details
//   3: described but somewhat general
//   2: unclear or overly broad
//   1: no situation provided
function scoreSituation(norm: string): number {
  // Strong: specific time + place + context
  if (
    /\b(when i was|during my|while i was|in my (previous|current|last)|at my (internship|job|work|school)|last (year|semester|month))\b/.test(norm)
  ) return 5;

  // Good: some context but less specific
  if (/\b(when|during|while|in a|at that time|one time|there was)\b/.test(norm)) return 4;

  // General: very broad situation words
  if (/\b(sometimes|usually|often|we had|our team|my group)\b/.test(norm)) return 3;

  // Vague: no real context given
  if (/\b(i think|maybe|sort of|kind of)\b/.test(norm)) return 2;

  // Nothing
  return 1;
}

// Task signals — maps to HR rubric:
//   5: explicitly stated and owned by applicant
//   4: identified but may lack depth
//   3: partially explained
//   2: not clearly defined
//   1: no task mentioned
function scoreTask(norm: string): number {
  // Strong: clear ownership + responsibility statement
  if (
    /\b(i was (responsible|in charge|assigned|tasked)|my (role|responsibility|job) was|i had to ensure|it was my task)\b/.test(norm)
  ) return 5;

  // Good: task mentioned but less ownership
  if (/\b(responsible|task|assigned|was to|needed to|had to|my role)\b/.test(norm)) return 4;

  // Partial: implied but not stated
  if (/\b(i (needed|wanted|tried) to|we were supposed to|i (helped|assisted))\b/.test(norm)) return 3;

  // Weak: very vague
  if (/\b(i did|i do|my part|something)\b/.test(norm)) return 2;

  // Nothing
  return 1;
}

// Action signals — maps to HR rubric:
//   5: specific, structured, demonstrate initiative
//   4: described with reasonable clarity
//   3: mentioned but lack depth
//   2: vague (e.g. "I did my best")
//   1: no actions described
function scoreAction(norm: string): number {
  // Strong: specific structured verbs showing initiative
  if (
    /\b(i (implemented|developed|designed|led|created|built|organized|restructured|coordinated|initiated|spearheaded|established|launched|resolved|streamlined|proposed|presented))\b/.test(norm)
  ) return 5;

  // Good: clear action verbs
  if (
    /\b(i (communicated|scheduled|managed|handled|worked|planned|collaborated|discussed|trained|monitored|delegated|completed|finished|prepared))\b/.test(norm)
  ) return 4;

  // Partial: generic action words
  if (/\b(i (did|made|tried|helped|assisted|supported|used|applied))\b/.test(norm)) return 3;

  // Vague: "I did my best", "I tried hard"
  if (/\b(did my best|tried hard|gave my all|did what i could)\b/.test(norm)) return 2;

  // Nothing
  return 1;
}

// Result signals — maps to HR rubric:
//   5: measurable or clearly defined result
//   4: stated but not strongly quantified
//   3: vague (e.g. "it went well")
//   2: no clear result described
//   1: no result at all
function scoreResult(norm: string): number {
  // Strong: measurable/quantified result
  if (
    /\b(\d+\s*%|\d+\s*percent|increased by|decreased by|reduced by|improved by|ahead of (schedule|deadline)|finished (early|on time|ahead)|completed within|saved \d+|zero (errors|complaints|issues))\b/.test(norm)
  ) return 5;

  // Good: result stated but not quantified
  if (
    /\b(successfully (completed|delivered|resolved|finished)|the (project|task|issue) was (completed|resolved|done)|we (achieved|met|reached|delivered)|as a result|the outcome was)\b/.test(norm)
  ) return 4;

  // Vague: "it went well", "it was good"
  if (
    /\b(it (went well|was (good|successful|fine|okay|ok))|things (worked out|got better)|positive (feedback|response)|everyone was (happy|satisfied))\b/.test(norm)
  ) return 3;

  // Weak: result implied but unclear
  if (/\b(i think it (helped|worked)|probably|might have|could have)\b/.test(norm)) return 2;

  // Nothing
  return 1;
}

// Reflection signals — maps to HR rubric:
//   5: reflects on lessons learned or professional growth
//   4: some reflection provided
//   3: limited reflection
//   2: no reflection or learning insight
//   1: absent
function scoreReflection(norm: string): number {
  // Strong: explicit growth/learning statement
  if (
    /\b(i (learned|realized|understood|discovered|grew|developed) (that|how|the importance|from)|this (experience|taught|showed|helped) me|i (gained|improved) my|it made me (better|more|realize)|professionally (grew|developed|matured))\b/.test(norm)
  ) return 5;

  // Good: some reflection but brief
  if (
    /\b(i (learned|realized|improved|grew)|it was a (learning|valuable|great) experience|i (take away|took away)|going forward|in the future i (will|would))\b/.test(norm)
  ) return 4;

  // Partial: implied but vague
  if (/\b(i (think|feel) i (improved|grew|did better)|i (understand|know) now|next time)\b/.test(norm)) return 3;

  // Weak: nothing meaningful
  if (/\b(it was (fine|okay|good)|no (complaints|issues)|happy with it)\b/.test(norm)) return 2;

  // Nothing
  return 1;
}

// Organization/confidence bonus — adjusts final score based on HR rubric
// descriptors: "concise, logical, confident" (5) vs "disorganized" (1)
function scoreOrganization(norm: string, wordCount: number): number {
  // Too short — likely disorganized or incomplete (HR rubric score 1–2)
  if (wordCount < 20) return 1;
  if (wordCount < 40) return 2;

  // Connective words signal logical structure (HR rubric: "concise and logical")
  const hasConnectives = /\b(first(ly)?|second(ly)?|then|after (that|which)|finally|as a result|therefore|because|however|additionally|furthermore|in conclusion)\b/.test(norm);
  if (hasConnectives && wordCount >= 60) return 5;
  if (hasConnectives) return 4;

  // Decent length but no explicit connectives
  if (wordCount >= 60) return 3;
  return 2;
}

export function evaluateWithSTAR(answer: string): {
  score: number;
  breakdown: STARBreakdown;
} {
  const norm = normalizeText(answer);
  const wordCount = norm.split(" ").filter(Boolean).length;

  const breakdown: STARBreakdown = {
    situation: scoreSituation(norm),
    task: scoreTask(norm),
    action: scoreAction(norm),
    result: scoreResult(norm),
    reflection: scoreReflection(norm),
  };

  // Organization acts as a modifier — clamps down scores for very short/disorganized answers
  const orgScore = scoreOrganization(norm, wordCount);

  // If answer is very short or disorganized, cap the maximum possible score
  // This reflects HR rubric: "Response is disorganized" → score 2 or below
  const cappedBreakdown: STARBreakdown = {
    situation: Math.min(breakdown.situation, orgScore === 1 ? 2 : orgScore === 2 ? 3 : 5),
    task: Math.min(breakdown.task, orgScore === 1 ? 2 : orgScore === 2 ? 3 : 5),
    action: Math.min(breakdown.action, orgScore === 1 ? 2 : orgScore === 2 ? 3 : 5),
    result: Math.min(breakdown.result, orgScore === 1 ? 2 : orgScore === 2 ? 3 : 5),
    reflection: Math.min(breakdown.reflection, orgScore === 1 ? 2 : orgScore === 2 ? 3 : 5),
  };

  const avg =
    (cappedBreakdown.situation +
      cappedBreakdown.task +
      cappedBreakdown.action +
      cappedBreakdown.result +
      cappedBreakdown.reflection) /
    5;

  return {
    score: Math.max(1, Math.min(5, Math.round(avg))),
    breakdown: cappedBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Public evaluate function
//
// Strategy:
//   1. Call RoBERTa via HF API (Path 1) — real semantic relevance score.
//      Blended 70% RoBERTa + 30% STAR.
//   2. If RoBERTa fails → fall back to ZSL STAR heuristic (Path 2).
//      Scored entirely against your official HR rubric descriptors.
//
// Both paths return:
//   - score (1–5) mapped to HR rubric
//   - full STAR breakdown across all five dimensions
//   - hrLabel showing the official HR rating string
// ---------------------------------------------------------------------------

export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<EvaluationResult> {
  // Always compute STAR — instant, no network, used as fallback + breakdown
  const star = evaluateWithSTAR(answer);

  // Find closest dataset question for reference metadata
  const { item: datasetMatch } = findBestMatch(question);

  // ── Path 1: RoBERTa via HF API ────────────────────────────────────────────
  try {
    const roberta = await callRoBERTa(question, answer);

    // Blend: 70% RoBERTa semantic score + 30% HR-rubric STAR score
    const blended = Math.round(roberta.score * 0.7 + star.score * 0.3);
    const finalScore = Math.max(1, Math.min(5, blended));

    return {
      source: "roberta_hf",
      matchedQuestion: datasetMatch?.question ?? null,
      baseScore: roberta.score,
      similarity: Number(roberta.rawConfidence.toFixed(3)),
      score: finalScore,
      breakdown: star.breakdown,
      hfRaw: roberta.rawConfidence,
      hrLabel: getHRLabel(finalScore),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn("[evaluateAnswer] RoBERTa API failed, falling back to ZSL STAR:", errorMessage);
  }

  // ── Path 2: ZSL STAR heuristic (local fallback) ───────────────────────────
  return {
    source: "zsl_star_fallback",
    matchedQuestion: null,
    baseScore: null,
    similarity: 0,
    score: star.score,
    breakdown: star.breakdown,
    hrLabel: getHRLabel(star.score),
    error: "RoBERTa API unavailable. Score computed locally using HR-calibrated ZSL STAR heuristic.",
  };
}

export default evaluateAnswer;
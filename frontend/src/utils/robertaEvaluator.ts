// ---------------------------------------------------------------------------
// robertaEvaluator.ts
//
// Two-path evaluation system:
//
//   Path 1 — RoBERTa via Vite proxy → HF Inference API
//             Calls /hf-api/... which Vite proxies to router.huggingface.co
//             This bypasses the browser CORS restriction entirely.
//             Blended: 55% RoBERTa + 25% dataset anchor + 20% STAR.
//
//   Path 2 — ZSL STAR Heuristic (local fallback, no network required)
//             Blended: 65% STAR + 35% dataset anchor when match exists.
//
// Dataset contribution (both paths):
//   All 806 HR-scored answers across 27 questions are searched via nearest-
//   neighbor (Jaccard similarity) to compute a calibrated score anchor.
//
// STAR is applied to ALL questions. Patterns cover both behavioral questions
// ("give an example") and open-ended questions ("tell me about yourself",
// "are you a team player") through expanded keyword coverage.
//
// Key fixes from v1:
//   1. Task/Action/Result patterns expanded to cover goal statements,
//      stance/value language, and growth/outcome language — not just
//      literal STAR verbs. Prevents intro/opinion answers scoring 1/1/1.
//   2. RoBERTa confidence floor: any answer >50 words with confidence >0.02
//      is floored to score 2, preventing low-confidence on self-descriptions
//      from destroying the final score.
//   3. score is always exactly the average of breakdown dimensions (invariant).
// ---------------------------------------------------------------------------

import robertaDataset, { DatasetItem, STARBreakdown } from '../data/robertaDataset';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HF_API_TOKEN = import.meta.env.VITE_HF_TOKEN as string | undefined;
const HF_TIMEOUT_MS = 10000;

// Proxied through Vite → router.huggingface.co (avoids CORS)
const HF_ROBERTA_URL = '/hf-api/hf-inference/models/deepset/roberta-base-squad2';

const DATASET_MATCH_THRESHOLD = 0.25;
const TOP_K_ANSWERS = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  source: 'roberta_hf' | 'zsl_star_fallback';
  matchedQuestion: string | null;
  questionAvgScore: number | null;
  datasetAnchorScore: number | null;
  datasetSimilarity: number;
  roberta_confidence: number;
  score: number;
  breakdown: STARBreakdown;
  hrLabel: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// HR Rubric Labels
// ---------------------------------------------------------------------------

const HR_LABELS: Record<number, string> = {
  5: 'Excellent — Exceeds Standard',
  4: 'Very Good — Above Standard',
  3: 'Good — Meets Standard',
  2: 'Fair — Below Standard',
  1: 'Needs Improvement — Unsatisfactory',
};
function getHRLabel(score: number): string {
  return HR_LABELS[Math.max(1, Math.min(5, Math.round(score)))] ?? 'Unscored';
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function normalizeText(s: string): string {
  return s.toLowerCase()
    .replace(/["'`.,()—\-]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokenSet(s: string): Set<string> {
  return new Set(normalizeText(s).split(' ').filter(Boolean));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  const ia = Array.from(a).filter(x => b.has(x));
  return ia.length ? ia.length / (a.size + b.size - ia.length) : 0;
}

// ---------------------------------------------------------------------------
// Dataset lookup — nearest-neighbor across all 806 answers
// ---------------------------------------------------------------------------

export interface DatasetLookupResult {
  item: DatasetItem | null;
  questionSimilarity: number;
  anchorScore: number | null;
  bestAnswerSimilarity: number;
}

export function lookupDataset(question: string, candidateAnswer: string): DatasetLookupResult {
  const qTokens = tokenSet(question);
  const aTokens = tokenSet(candidateAnswer);

  let bestItem: DatasetItem | null = null;
  let bestQSim = 0;
  for (const it of robertaDataset) {
    const sim = jaccard(qTokens, tokenSet(it.question));
    if (sim > bestQSim) { bestQSim = sim; bestItem = it; }
  }
  if (!bestItem || bestQSim < DATASET_MATCH_THRESHOLD) {
    return { item: null, questionSimilarity: bestQSim, anchorScore: null, bestAnswerSimilarity: 0 };
  }

  const scored = bestItem.answers
    .map(ans => ({ similarity: jaccard(aTokens, tokenSet(ans.text)), avgScore: ans.avgScore }))
    .sort((a, b) => b.similarity - a.similarity);

  const topK = scored.slice(0, TOP_K_ANSWERS).filter(s => s.similarity > 0);
  if (!topK.length) {
    return { item: bestItem, questionSimilarity: bestQSim, anchorScore: null, bestAnswerSimilarity: 0 };
  }

  const totalWeight = topK.reduce((s, x) => s + x.similarity, 0);
  const anchorScore = parseFloat(
    (topK.reduce((s, x) => s + x.avgScore * x.similarity, 0) / totalWeight).toFixed(2)
  );
  return { item: bestItem, questionSimilarity: bestQSim, anchorScore, bestAnswerSimilarity: topK[0].similarity };
}

// ---------------------------------------------------------------------------
// Path 1 — RoBERTa via Vite proxy
// ---------------------------------------------------------------------------

async function callRoBERTa(question: string, answer: string): Promise<number> {
  if (!HF_API_TOKEN) throw new Error('VITE_HF_TOKEN is not set.');
  const controller = new AbortController();
  const tid = window.setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
  try {
    const res = await fetch(HF_ROBERTA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: { question, context: answer } }),
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 503) throw new Error('RoBERTa model loading. Retry in ~20s.');
      if (res.status === 401) throw new Error('Invalid HF token. Check VITE_HF_TOKEN.');
      throw new Error(`RoBERTa API ${res.status}: ${await res.text().catch(() => '')}`);
    }
    const data = await res.json();
    return Math.max(0, Math.min(1, typeof data.score === 'number' ? data.score : 0));
  } finally {
    window.clearTimeout(tid);
  }
}

// RoBERTa confidence → 1–5 scale.
// Floor rule: answers >50 words with any detected content (confidence >0.02)
// score at least 2. This prevents open-ended/intro answers from scoring 1
// just because RoBERTa (a QA extractor) couldn't find a specific answer span.
function confidenceToScore(c: number, wordCount: number): number {
  const floor = (wordCount > 50 && c > 0.02) ? 2 : 1;
  if (c >= 0.80) return 5;
  if (c >= 0.60) return 4;
  if (c >= 0.40) return 3;
  if (c >= 0.20) return Math.max(floor, 2);
  return floor;
}

// ---------------------------------------------------------------------------
// STAR Scoring — applied to all 27 questions
//
// Dimension mapping (works for both STAR and open-ended questions):
//   Situation  = background / context / framing
//   Task       = goal / role / purpose / what they stand for
//   Action     = concrete evidence / specific things done
//   Result     = outcome / growth / impact / what changed
//   Reflection = self-awareness / learning / identity
// ---------------------------------------------------------------------------

function scoreSituation(n: string): number {
  if (/\b(during my (ojt|internship|thesis|student teaching|practicum|clinical|rotation|field|capstone|community)|when i was (a|an|in|doing|working|studying|handling|leading|assigned|tasked)|in my (first|second|third|fourth|last|final) year|one time (during|when|in|at)|at my (ojt|internship|previous|former)|while i was (doing|working|studying|handling|leading)|in (engineering|nursing|accounting|hospitality|teaching|farming|our rotation|our class|our group|our team|our thesis|our capstone|our department))\b/.test(n)) return 5;
  if (/\b(when|during|while|in a|at that time|there was a time|one time|i remember when|back when|in my (experience|background|case)|from my (experience|background))\b/.test(n)) return 4;
  if (/\b(sometimes|usually|often|generally|in school|in our|for me|personally|in my opinion|from what i)\b/.test(n)) return 3;
  if (/\b(i think|i believe|i feel|i guess|i suppose|maybe|kind of|sort of)\b/.test(n)) return 2;
  return 1;
}

function scoreTask(n: string): number {
  // Explicit role/responsibility OR clear goal/purpose/aspiration
  if (/\b(i was (responsible for|in charge of|assigned to|tasked to|appointed|designated|chosen|selected as|the one who|asked to|expected to|supposed to)|my (role|responsibility|job|task|goal|mission|purpose|duty) (was|is|has been|has always been)|it was my (job|task|responsibility|duty|role) to|i am here (to|because|for)|my (goal|aim|objective|purpose|mission|intention|aspiration) (is|was|has always been|has been))\b/.test(n)) return 5;
  // Goal-oriented / intent / personal decision
  if (/\b(i (want|wanted|aim|plan|hope|intend|aspire|strive) to (become|be|contribute|help|build|develop|grow|improve|achieve|succeed|work|serve)|i believe in |i value |i prioritize |i (chose|took up|studied|enrolled|graduated|committed|dedicated))\b/.test(n)) return 4;
  // General personal direction
  if (/\b(i (am|was|have been|keep|try|do|make|focus)|i (like|enjoy|prefer|appreciate|care about)|its (important|essential|key|necessary)|to (make|do|get|achieve|reach|meet|finish|complete))\b/.test(n)) return 3;
  if (/\b(i (did|joined|applied|went|came|showed up|participated|helped)|my part|okay|fine|sure|yes|yeah)\b/.test(n)) return 2;
  return 1;
}

function scoreAction(n: string): number {
  // Strong initiative verbs
  if (/\b(i (suggested|proposed|initiated|implemented|developed|designed|led|created|built|organized|restructured|coordinated|established|resolved|streamlined|introduced|facilitated|volunteered|launched|started|set up|came up with|stepped up|pushed for|advocated|coached|mentored|trained|spearheaded|took (on|over|charge|initiative|lead)|overhauled|rewrote|redesigned|formulated|devised|drafted|directed|supervised|headed|ran|executed|deployed|automated|simplified|standardized|integrated|revamped|transformed))\b/.test(n)) return 5;
  // Concrete evidence / specific past actions
  if (/\b(for example|for instance|i (once|actually|remember)|i (worked|handled|managed|completed|finished|submitted|delivered|presented|prepared|collaborated|planned|tracked|reviewed|reached out|communicated|discussed|documented|reported|checked|updated|spent|put in))\b/.test(n)) return 4;
  // General doing verbs
  if (/\b(i (did|made|tried|helped|used|applied|participated|contributed|took|got|gave|read|watched|studied|learned|practiced|attended|went|called|met|saw|wrote|sent|asked))\b/.test(n)) return 3;
  if (/\b(did my best|tried hard|gave my all|i was (just|there))\b/.test(n)) return 2;
  return 1;
}

function scoreResult(n: string): number {
  // Quantified outcome
  if (/\b(\d+\s*(%|percent)|increased (by|the)|decreased|reduced|improved by|ahead of (schedule|deadline)|finished (early|on time|ahead)|saved \d+|doubled|tripled|halved|cut (the )?time)\b/.test(n)) return 5;
  // Clear concrete outcome
  if (/\b(i (passed|graduated|completed|finished|succeeded|managed to|was able to|ended up|earned|achieved|received|won|became|grew|improved|developed|launched|published)|they (adopted|used|kept|continued|accepted|approved)|my (supervisor|professor|adviser|ci|instructor|manager|teacher|mentor) (commended|praised|mentioned|thanked|approved|said|told me|noted|recognized)|as a result|in the end|eventually|it (worked out|paid off|helped|led|resulted|went well|made a difference)|that (worked|helped|changed|shaped|taught|showed|gave|led)|which (led|helped|resulted|meant|made)|we (achieved|met|reached|passed|delivered|submitted|finished|completed)|i now (have|know|can|am able to)|i (still|carry that|apply that|use that|remember that|value that|think about that)|so (i|we|it|that) (learned|realized|grew|changed|improved|became|succeeded|managed|finished|passed)|going forward|i have (since|become|grown|improved|developed|learned)|i (carry|apply|use|remember|value|take away|still) (that|this|it))\b/.test(n)) return 4;
  // Vague positive outcome
  if (/\b((it|things|everything) (went well|got better|worked out|was okay|was good|was fine|was great)|positive (feedback|result|response)|everyone (was happy|liked it|appreciated)|i felt (better|good|proud|confident|relieved))\b/.test(n)) return 3;
  if (/\b(i think it (helped|worked)|probably|hopefully|might have|could have|im not sure|i dont know)\b/.test(n)) return 2;
  return 1;
}

function scoreReflection(n: string): number {
  // Explicit learning / self-awareness / identity
  if (/\b(i (learned|realized|understood|discovered|recognized|now understand|now know|now see|now believe|now value) (that|how|the importance|from|why|what)|this (experience|shows|taught|reminded|helped|shaped|changed|made|showed|gave|led) me|i (am|have become|have grown|have developed|have improved) (more|better|stronger|wiser|more aware|more confident|more patient)|i (still|carry|apply|use|remember|value|think about) (that|this|it)|im the type (of person)? (who|that)|im someone who|thats (who|what|how|where|why) i am|thats (who|what|how) i (try to be|want to be|strive to be|became))\b/.test(n)) return 5;
  // Growth orientation
  if (/\b(i (have learned|have realized|have grown|have improved|have developed|have become|have gained)|i (try to be|consider myself|see myself as|know myself|push myself|challenge myself|hold myself)|i (am not perfect|am still learning|am still improving|am still growing|am still working on|need to work on)|going forward|i (will|want to) (keep|continue|improve|grow|develop|learn|do better|work on))\b/.test(n)) return 4;
  // Tentative self-awareness
  if (/\b(i (think i|feel i|believe i|hope i) (am|can|do|will|have|could|should|would|try|work|improve|grow)|i (am|try to be|tend to be|sometimes|often) (someone who|the type who|careful|honest|direct|calm|patient|competitive|hardworking|dedicated|reliable|flexible|adaptable))\b/.test(n)) return 3;
  if (/\b(i (think|believe|feel|guess|hope|suppose)|sometimes|usually|generally|kind of|sort of|a bit)\b/.test(n)) return 2;
  return 1;
}

function scoreOrg(n: string, wc: number): number {
  if (wc < 15) return 1;
  if (wc < 30) return 2;
  const conn = /\b(first(ly)?|second(ly)?|then|after (that|which)|finally|as a result|therefore|because|however|additionally|furthermore|also|and then|but then|so i|which (meant|helped|led|resulted))\b/.test(n);
  if (conn && wc >= 60) return 5;
  if (conn || wc >= 80) return 4;
  if (wc >= 40) return 3;
  return 2;
}

function computeBreakdown(n: string, wc: number): STARBreakdown {
  const org = scoreOrg(n, wc);
  const cap = org <= 1 ? 2 : org <= 2 ? 3 : 5;
  return {
    situation:  Math.min(scoreSituation(n),  cap),
    task:       Math.min(scoreTask(n),       cap),
    action:     Math.min(scoreAction(n),     cap),
    result:     Math.min(scoreResult(n),     cap),
    reflection: Math.min(scoreReflection(n), cap),
  };
}

// ---------------------------------------------------------------------------
// Blend / scale helpers
// ---------------------------------------------------------------------------

function blendBreakdowns(a: STARBreakdown, b: STARBreakdown, bWeight: number): STARBreakdown {
  const aw = 1 - bWeight;
  return {
    situation:  Math.round(a.situation  * aw + b.situation  * bWeight),
    task:       Math.round(a.task       * aw + b.task       * bWeight),
    action:     Math.round(a.action     * aw + b.action     * bWeight),
    result:     Math.round(a.result     * aw + b.result     * bWeight),
    reflection: Math.round(a.reflection * aw + b.reflection * bWeight),
  };
}

function breakdownToScore(bd: STARBreakdown): number {
  return parseFloat(((bd.situation + bd.task + bd.action + bd.result + bd.reflection) / 5).toFixed(2));
}

// Scale all dims proportionally so their average == targetScore.
// Breakdown dimensions are whole numbers (1-5); the average stays decimal.
// Invariant: score always equals breakdownToScore(breakdown).
function scaleBDToTarget(bd: STARBreakdown, targetScore: number): STARBreakdown {
  const avg = (bd.situation + bd.task + bd.action + bd.result + bd.reflection) / 5;
  const ratio = avg > 0 ? targetScore / avg : 1;
  return {
    situation:  Math.min(5, Math.max(1, Math.round(bd.situation  * ratio))),
    task:       Math.min(5, Math.max(1, Math.round(bd.task       * ratio))),
    action:     Math.min(5, Math.max(1, Math.round(bd.action     * ratio))),
    result:     Math.min(5, Math.max(1, Math.round(bd.result     * ratio))),
    reflection: Math.min(5, Math.max(1, Math.round(bd.reflection * ratio))),
  };
}

// ---------------------------------------------------------------------------
// Public evaluate function
// ---------------------------------------------------------------------------

export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<EvaluationResult> {
  const norm = normalizeText(answer);
  const wordCount = norm.split(' ').filter(Boolean).length;

  // Step 1: Dataset nearest-neighbor lookup
  const lookup = lookupDataset(question, answer);
  const hasDataset = lookup.item !== null && lookup.anchorScore !== null;

  // Step 2: STAR breakdown, blended with dataset question breakdown if match found
  const rawBD = computeBreakdown(norm, wordCount);
  const blendedBD: STARBreakdown =
    hasDataset && lookup.bestAnswerSimilarity > 0.1
      ? blendBreakdowns(rawBD, lookup.item!.breakdown, Math.min(0.35, lookup.bestAnswerSimilarity * 0.5))
      : rawBD;

  const localScore = breakdownToScore(blendedBD);

  // ── Path 1: RoBERTa via Vite proxy ──────────────────────────────────────
  try {
    const confidence = await callRoBERTa(question, answer);
    const robertaScore = confidenceToScore(confidence, wordCount);

    const targetScore = Math.max(1, Math.min(5,
      hasDataset && lookup.anchorScore !== null
        ? robertaScore * 0.55 + lookup.anchorScore * 0.25 + localScore * 0.20
        : robertaScore * 0.70 + localScore * 0.30
    ));

    const scaledBD = scaleBDToTarget(blendedBD, targetScore);
    const finalScore = breakdownToScore(scaledBD);

    return {
      source: 'roberta_hf',
      matchedQuestion: lookup.item?.question ?? null,
      questionAvgScore: lookup.item?.questionAvgScore ?? null,
      datasetAnchorScore: lookup.anchorScore,
      datasetSimilarity: parseFloat(lookup.bestAnswerSimilarity.toFixed(3)),
      roberta_confidence: parseFloat(confidence.toFixed(3)),
      score: finalScore,
      breakdown: scaledBD,
      hrLabel: getHRLabel(finalScore),
    };
  } catch (err) {
    console.warn('[evaluateAnswer] RoBERTa failed, using ZSL STAR:', err instanceof Error ? err.message : err);
  }

  // ── Path 2: ZSL STAR + dataset anchor fallback ───────────────────────────
  const targetScore = Math.max(1, Math.min(5,
    hasDataset && lookup.anchorScore !== null
      ? localScore * 0.65 + lookup.anchorScore * 0.35
      : localScore
  ));

  const scaledBD = scaleBDToTarget(blendedBD, targetScore);
  const finalScore = breakdownToScore(scaledBD);

  return {
    source: 'zsl_star_fallback',
    matchedQuestion: lookup.item?.question ?? null,
    questionAvgScore: lookup.item?.questionAvgScore ?? null,
    datasetAnchorScore: lookup.anchorScore,
    datasetSimilarity: parseFloat(lookup.bestAnswerSimilarity.toFixed(3)),
    roberta_confidence: 0,
    score: finalScore,
    breakdown: scaledBD,
    hrLabel: getHRLabel(finalScore),
    error: 'RoBERTa API unavailable. Score computed using ZSL STAR + dataset anchor.',
  };
}

export default evaluateAnswer;
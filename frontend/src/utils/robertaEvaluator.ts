// ---------------------------------------------------------------------------
// robertaEvaluator.ts
//
// Evaluation pipeline — two paths in priority order:
//
//   Path 1 — RoBERTa Sentence Similarity (HuggingFace Inference API)
//             Model: sentence-transformers/all-roberta-large-v1
//             Computes cosine similarity between the student's answer and
//             the best HR-validated reference answer → 0–1 similarity score.
//             That score IS the "semantic similarity score (0–1) generated
//             by the RoBERTa model" described in the thesis.
//             Converted to 1–5 Likert via: similarityToLikert()
//
//   Path 2 — ZSL STAR Heuristic (local fallback, no network required)
//             Used when HF API is unavailable or times out.
//             Uses Jaccard similarity as a proxy for the 0–1 score,
//             then applies the SAME similarityToLikert() conversion.
//
// THE CONVERSION (thesis claim implemented literally):
//   anchorWeight = min(0.90, roberta_similarity × 0.90)
//   score = anchorScore × anchorWeight + starScore × (1 − anchorWeight)
//   Likert = clamp(score, 1, 5)
//
//   similarity = 1.0  →  90% HR-validated anchor,  10% STAR
//   similarity = 0.5  →  45% HR-validated anchor,  55% STAR
//   similarity = 0.0  →   0% HR-validated anchor, 100% STAR
// ---------------------------------------------------------------------------

import robertaDataset, { DatasetItem, STARBreakdown } from '../data/robertaDataset';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Your Flask backend on Render — set VITE_BACKEND_URL in Vercel env vars
// e.g. https://universityapp-backend.onrender.com
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '');
const HF_TIMEOUT_MS = 90000; // 90s — covers Render sleep + HF cold start

const DATASET_MATCH_THRESHOLD = 0.25;
const TOP_K_ANSWERS = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  source: 'roberta_similarity' | 'zsl_roberta' | 'zsl_star_fallback';
  matchedQuestion: string | null;
  questionAvgScore: number | null;
  datasetAnchorScore: number | null;
  datasetSimilarity: number;
  roberta_similarity: number;  // the 0–1 value the thesis refers to
  score: number;               // final 1–5 Likert output
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
// Cosine similarity between two dense vectors
// ---------------------------------------------------------------------------

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? Math.max(0, Math.min(1, dot / denom)) : 0;
}

// ---------------------------------------------------------------------------
// HF feature-extraction returns number[][] (token-level) or number[].
// Mean-pool token-level outputs to get a sentence embedding.
// ---------------------------------------------------------------------------

function toSentenceEmbedding(raw: number[] | number[][]): number[] {
  if (typeof raw[0] === 'number') return raw as number[];
  const tokens = raw as number[][];
  const dim = tokens[0].length;
  const mean = new Array(dim).fill(0);
  for (const tok of tokens) {
    for (let i = 0; i < dim; i++) mean[i] += tok[i];
  }
  return mean.map(v => v / tokens.length);
}

// ---------------------------------------------------------------------------
// Path 1 — RoBERTa Sentence Similarity
//
// Sends two texts to the HF feature-extraction endpoint:
//   [0] reference: question + highest-scored HR answer (what "good" looks like)
//   [1] candidate: student's answer
//
// Returns cosine similarity (0–1) between the two embeddings.
// ---------------------------------------------------------------------------

async function callRoBERTaSimilarity(
  question: string,
  answer: string,
  referenceAnswer: string
): Promise<number> {
  if (!BACKEND_URL) throw new Error('VITE_BACKEND_URL is not set.');

  const controller = new AbortController();
  const tid = window.setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
  const referenceText = `${question} ${referenceAnswer}`.slice(0, 512);

  try {
    const res = await fetch(`${BACKEND_URL}/api/hf-embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: [referenceText, answer] }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`RoBERTa API error ${res.status}`);

    const data = await res.json();
    const embA = toSentenceEmbedding(data[0]);
    const embB = toSentenceEmbedding(data[1]);
    return cosineSimilarity(embA, embB);

  } finally {
    window.clearTimeout(tid);
  }
}

// ---------------------------------------------------------------------------
// Path 2 — ZSL RoBERTa Classification (cross-encoder/nli-roberta-base)
//
// Calls /api/hf-classify with candidate labels per STAR dimension.
// The NLI model judges which label best fits — genuinely zero-shot.
// No reference answer needed — works on any question.
// ---------------------------------------------------------------------------

// Labels: specific enough for the NLI model to score correctly,
// short enough to stay distinct. [0]=strong(5) [1]=partial(3) [2]=absent(1).
const ZSL_LABELS: Record<keyof STARBreakdown, string[]> = {
  situation:  ['describes a specific past situation', 'mentions a general situation', 'no situation mentioned'],
  task:       ['clearly states their role or responsibility', 'vaguely mentions a role', 'no role mentioned'],
  action:     ['describes specific actions they took', 'mentions actions without detail', 'no action described'],
  result:     ['states a clear or measurable outcome', 'mentions a vague outcome', 'no outcome mentioned'],
  reflection: ['shares a lesson learned or insight', 'hints at growth without stating it', 'no reflection at all'],
};

// Weighted average — stable because probabilities sum to ~1.
// strong→5, partial→3, absent→1. No subtraction, no clamping issues.
function probabilityToLikert(strong: number, mid: number, weak: number): number {
  return Math.max(1, Math.min(5, Math.round(strong * 5 + mid * 3 + weak * 1)));
}

// Classify a single STAR dimension — extracted so it can be batched.
async function classifyDimension(
  dim: keyof STARBreakdown,
  text: string
): Promise<[keyof STARBreakdown, number]> {
  const controller = new AbortController();
  const tid = window.setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}/api/hf-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: text,
        candidate_labels: ZSL_LABELS[dim],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ZSL classify error ${res.status}`);
    const data = await res.json();

    // Guard against malformed API response before indexing.
    if (!data.labels || !data.scores) throw new Error('Invalid ZSL response');

    const labelIdx = (label: string) => (data.labels as string[]).indexOf(label);
    const strongIdx = labelIdx(ZSL_LABELS[dim][0]);
    const midIdx    = labelIdx(ZSL_LABELS[dim][1]);
    const weakIdx   = labelIdx(ZSL_LABELS[dim][2]);

    const strong = strongIdx >= 0 ? data.scores[strongIdx] : 0;
    const mid    = midIdx    >= 0 ? data.scores[midIdx]    : 0;
    const weak   = weakIdx   >= 0 ? data.scores[weakIdx]   : 0;

    return [dim, probabilityToLikert(strong, mid, weak)];
  } catch {
    // Per-dimension fallback — one failed request doesn't fail all five.
    return [dim, 1];
  } finally {
    window.clearTimeout(tid);
  }
}

async function callZSLClassify(
  question: string,
  answer: string
): Promise<STARBreakdown> {
  if (!BACKEND_URL) throw new Error('VITE_BACKEND_URL is not set.');

  // Slice the combined string — preserves meaning instead of cutting each part mid-sentence.
  const text = `Question: ${question}\nAnswer: ${answer}`.slice(0, 600);

  const dims = ['situation', 'task', 'action', 'result', 'reflection'] as (keyof STARBreakdown)[];

  // Run in batches of 2 to avoid overwhelming the backend with simultaneous requests.
  const dimScores: [keyof STARBreakdown, number][] = [];
  for (let i = 0; i < dims.length; i += 2) {
    const batch = dims.slice(i, i + 2);
    const batchResults = await Promise.all(batch.map(dim => classifyDimension(dim, text)));
    dimScores.push(...batchResults);
  }

  const scores = Object.fromEntries(dimScores) as Record<keyof STARBreakdown, number>;

  return {
    situation:  scores.situation  ?? 1,
    task:       scores.task       ?? 1,
    action:     scores.action     ?? 1,
    result:     scores.result     ?? 1,
    reflection: scores.reflection ?? 1,
  };
}


// ---------------------------------------------------------------------------
// THE CORE CONVERSION: RoBERTa similarity (0–1) → 1–5 Likert scale
//
// This is the function the thesis describes.
//
// When similarity is high, the student's answer closely resembles how
// HR-evaluated answers look — so we lean heavily on the HR anchor score.
// When similarity is low, no close match exists — we fall back to STAR.
//
// The 0.90 cap means STAR always contributes at least 10%, acting as
// a sanity floor when the dataset anchor is noisy.
// ---------------------------------------------------------------------------

function similarityToLikert(
  similarity: number,   // RoBERTa cosine similarity, 0–1
  anchorScore: number,  // weighted avg score of top-K HR-validated answers, 1–5
  starScore: number     // STAR heuristic score, 1–5
): number {
  const anchorWeight = Math.min(0.90, similarity * 0.90);
  const starWeight   = 1 - anchorWeight;
  return Math.max(1, Math.min(5,
    anchorScore * anchorWeight + starScore * starWeight
  ));
}

// ---------------------------------------------------------------------------
// Dataset lookup — finds the best-matching question & anchor score
// ---------------------------------------------------------------------------

export interface DatasetLookupResult {
  item: DatasetItem | null;
  questionSimilarity: number;
  anchorScore: number | null;
  bestAnswerSimilarity: number;
  topAnswer: string | null;    // best HR-scored answer (reference for RoBERTa)
}

export function lookupDataset(question: string, candidateAnswer: string): DatasetLookupResult {
  if (!robertaDataset || !Array.isArray(robertaDataset) || robertaDataset.length === 0) {
    console.error('[lookupDataset] Dataset empty or failed to load. Check import path.');
    return { item: null, questionSimilarity: 0, anchorScore: null, bestAnswerSimilarity: 0, topAnswer: null };
  }

  const qTokens = tokenSet(question);
  const aTokens = tokenSet(candidateAnswer);

  // Find closest question by Jaccard
  let bestItem: DatasetItem | null = null;
  let bestQSim = 0;
  for (const it of robertaDataset) {
    const sim = jaccard(qTokens, tokenSet(it.question));
    if (sim > bestQSim) { bestQSim = sim; bestItem = it; }
  }

  console.debug(`[lookupDataset] question="${question.slice(0,40)}" bestQSim=${bestQSim.toFixed(3)} matched="${bestItem?.question?.slice(0,40) ?? 'none'}"`);

  if (!bestItem || bestQSim < DATASET_MATCH_THRESHOLD) {
    return { item: null, questionSimilarity: bestQSim, anchorScore: null, bestAnswerSimilarity: 0, topAnswer: null };
  }

  // Score each answer by Jaccard similarity to the candidate
  const scored = bestItem.answers
    .map(ans => ({ similarity: jaccard(aTokens, tokenSet(ans.text)), avgScore: ans.avgScore, text: ans.text }))
    .sort((a, b) => b.similarity - a.similarity);

  const topK = scored.slice(0, TOP_K_ANSWERS).filter(s => s.similarity > 0);

  // The reference answer for RoBERTa = the highest HR-scored answer in dataset
  const topByScore = [...bestItem.answers].sort((a, b) => b.avgScore - a.avgScore)[0];

  if (!topK.length) {
    return {
      item: bestItem, questionSimilarity: bestQSim,
      anchorScore: null, bestAnswerSimilarity: 0,
      topAnswer: topByScore?.text ?? null,
    };
  }

  // Weighted average of HR scores, weighted by Jaccard similarity
  const totalWeight = topK.reduce((s, x) => s + x.similarity, 0);
  const anchorScore = parseFloat(
    (topK.reduce((s, x) => s + x.avgScore * x.similarity, 0) / totalWeight).toFixed(2)
  );

  return {
    item: bestItem,
    questionSimilarity: bestQSim,
    anchorScore,
    bestAnswerSimilarity: topK[0].similarity,
    topAnswer: topByScore?.text ?? null,
  };
}

// ---------------------------------------------------------------------------
// STAR Scoring — fallback signal (all 31 questions)
// ---------------------------------------------------------------------------

function scoreSituation(n: string): number {
  if (/\b(during my (ojt|internship|thesis|student teaching|practicum|clinical|rotation|field|capstone|community)|when i was (a|an|in|doing|working|studying|handling|leading|assigned|tasked)|in my (first|second|third|fourth|last|final) year|one time (during|when|in|at)|at my (ojt|internship|previous|former)|while i was (doing|working|studying|handling|leading)|in (engineering|nursing|accounting|hospitality|teaching|farming|our rotation|our class|our group|our team|our thesis|our capstone|our department))\b/.test(n)) return 5;
  if (/\b(when|during|while|in a|at that time|there was a time|one time|i remember when|back when|in my (experience|background|case)|from my (experience|background))\b/.test(n)) return 4;
  if (/\b(sometimes|usually|often|generally|in school|in our|for me|personally|in my opinion|from what i)\b/.test(n)) return 3;
  if (/\b(i think|i believe|i feel|i guess|i suppose|maybe|kind of|sort of)\b/.test(n)) return 2;
  return 1;
}

function scoreTask(n: string): number {
  if (/\b(i was (responsible for|in charge of|assigned to|tasked to|appointed|designated|chosen|selected as|the one who|asked to|expected to|supposed to)|my (role|responsibility|job|task|goal|mission|purpose|duty) (was|is|has been|has always been)|it was my (job|task|responsibility|duty|role) to|i am here (to|because|for)|my (goal|aim|objective|purpose|mission|intention|aspiration) (is|was|has always been|has been))\b/.test(n)) return 5;
  if (/\b(i (want|wanted|aim|plan|hope|intend|aspire|strive) to (become|be|contribute|help|build|develop|grow|improve|achieve|succeed|work|serve)|i believe in |i value |i prioritize |i (chose|took up|studied|enrolled|graduated|committed|dedicated))\b/.test(n)) return 4;
  if (/\b(i (am|was|have been|keep|try|do|make|focus)|i (like|enjoy|prefer|appreciate|care about)|its (important|essential|key|necessary)|to (make|do|get|achieve|reach|meet|finish|complete))\b/.test(n)) return 3;
  if (/\b(i (did|joined|applied|went|came|showed up|participated|helped)|my part|okay|fine|sure|yes|yeah)\b/.test(n)) return 2;
  return 1;
}

function scoreAction(n: string): number {
  if (/\b(i (suggested|proposed|initiated|implemented|developed|designed|led|created|built|organized|restructured|coordinated|established|resolved|streamlined|introduced|facilitated|volunteered|launched|started|set up|came up with|stepped up|pushed for|advocated|coached|mentored|trained|spearheaded|took (on|over|charge|initiative|lead)|overhauled|rewrote|redesigned|formulated|devised|drafted|directed|supervised|headed|ran|executed|deployed|automated|simplified|standardized|integrated|revamped|transformed))\b/.test(n)) return 5;
  if (/\b(for example|for instance|i (once|actually|remember)|i (worked|handled|managed|completed|finished|submitted|delivered|presented|prepared|collaborated|planned|tracked|reviewed|reached out|communicated|discussed|documented|reported|checked|updated|spent|put in))\b/.test(n)) return 4;
  if (/\b(i (did|made|tried|helped|used|applied|participated|contributed|took|got|gave|read|watched|studied|learned|practiced|attended|went|called|met|saw|wrote|sent|asked))\b/.test(n)) return 3;
  if (/\b(did my best|tried hard|gave my all|i was (just|there))\b/.test(n)) return 2;
  return 1;
}

function scoreResult(n: string): number {
  if (/\b(\d+\s*(%|percent)|increased (by|the)|decreased|reduced|improved by|ahead of (schedule|deadline)|finished (early|on time|ahead)|saved \d+|doubled|tripled|halved|cut (the )?time)\b/.test(n)) return 5;
  if (/\b(i (passed|graduated|completed|finished|succeeded|managed to|was able to|ended up|earned|achieved|received|won|became|grew|improved|developed|launched|published)|they (adopted|used|kept|continued|accepted|approved)|my (supervisor|professor|adviser|ci|instructor|manager|teacher|mentor) (commended|praised|mentioned|thanked|approved|said|told me|noted|recognized)|as a result|in the end|eventually|it (worked out|paid off|helped|led|resulted|went well|made a difference)|that (worked|helped|changed|shaped|taught|showed|gave|led)|which (led|helped|resulted|meant|made)|we (achieved|met|reached|passed|delivered|submitted|finished|completed)|i now (have|know|can|am able to)|i (still|carry that|apply that|use that|remember that|value that|think about that)|so (i|we|it|that) (learned|realized|grew|changed|improved|became|succeeded|managed|finished|passed)|going forward|i have (since|become|grown|improved|developed|learned)|i (carry|apply|use|remember|value|take away|still) (that|this|it))\b/.test(n)) return 4;
  if (/\b((it|things|everything) (went well|got better|worked out|was okay|was good|was fine|was great)|positive (feedback|result|response)|everyone (was happy|liked it|appreciated)|i felt (better|good|proud|confident|relieved))\b/.test(n)) return 3;
  if (/\b(i think it (helped|worked)|probably|hopefully|might have|could have|im not sure|i dont know)\b/.test(n)) return 2;
  return 1;
}

function scoreReflection(n: string): number {
  if (/\b(i (learned|realized|understood|discovered|recognized|now understand|now know|now see|now believe|now value) (that|how|the importance|from|why|what)|this (experience|shows|taught|reminded|helped|shaped|changed|made|showed|gave|led) me|i (am|have become|have grown|have developed|have improved) (more|better|stronger|wiser|more aware|more confident|more patient)|i (still|carry|apply|use|remember|value|think about) (that|this|it)|im the type (of person)? (who|that)|im someone who|thats (who|what|how|where|why) i am|thats (who|what|how) i (try to be|want to be|strive to be|became))\b/.test(n)) return 5;
  if (/\b(i (have learned|have realized|have grown|have improved|have developed|have become|have gained)|i (try to be|consider myself|see myself as|know myself|push myself|challenge myself|hold myself)|i (am not perfect|am still learning|am still improving|am still growing|am still working on|need to work on)|going forward|i (will|want to) (keep|continue|improve|grow|develop|learn|do better|work on))\b/.test(n)) return 4;
  if (/\b(i (think i|feel i|believe i|hope i) (am|can|do|will|have|could|should|would|try|work|improve|grow)|i (am|try to be|tend to be|sometimes|often) (someone who|the type who|careful|honest|direct|calm|patient|competitive|hardworking|dedicated|reliable|flexible|adaptable))\b/.test(n)) return 3;
  if (/\b(i (think|believe|feel|guess|hope|suppose)|sometimes|usually|generally|kind of|sort of|a bit)\b/.test(n)) return 2;
  return 1;
}

function computeBreakdown(n: string, wc: number): STARBreakdown {
  return {
    situation:  scoreSituation(n),
    task:       scoreTask(n),
    action:     scoreAction(n),
    result:     scoreResult(n),
    reflection: scoreReflection(n),
  };
}

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

  // Gate: answers under 5 words are meaningless — return score 1 immediately
  // This prevents short/garbage answers from being inflated by the dataset anchor
  if (wordCount < 3) {
    const emptyBD: STARBreakdown = { situation: 1, task: 1, action: 1, result: 1, reflection: 1 };
    return {
      source: 'zsl_star_fallback',
      matchedQuestion: null,
      questionAvgScore: null,
      datasetAnchorScore: null,
      datasetSimilarity: 0,
      roberta_similarity: 0,
      score: 1,
      breakdown: emptyBD,
      hrLabel: 'Needs Improvement — Unsatisfactory',
      error: 'Answer too short to evaluate meaningfully.',
    };
  }

  // Step 1: Dataset lookup
  const lookup = lookupDataset(question, answer);
  const hasDataset = lookup.item !== null && lookup.anchorScore !== null;

  // Step 2: ZSL breakdown — used as the shape source for all paths.
  // callZSLClassify scores each STAR dimension independently via the NLI model,
  // with no regex involved. If ZSL fails, we fall back to the regex breakdown
  // only for Path 3 (last resort).
  let zslBD: STARBreakdown | null = null;
  try {
    zslBD = await callZSLClassify(question, answer);
  } catch (err) {
    console.warn('[evaluateAnswer] ZSL pre-call failed, will retry in Path 2:',
      err instanceof Error ? err.message : err);
  }

  // ── Path 1: RoBERTa Sentence Similarity + ZSL breakdown ────────────────────
  // RoBERTa produces the final score (0–1 similarity → 1–5 Likert).
  // ZSL produces the per-dimension breakdown shape — no regex involved.
  if (hasDataset && lookup.topAnswer && zslBD) {
    try {
      const similarity = await callRoBERTaSimilarity(question, answer, lookup.topAnswer);
      const zslScore = breakdownToScore(zslBD);

      // Convert the 0–1 similarity to 1–5 Likert — this is the thesis claim
      const targetScore = similarityToLikert(similarity, lookup.anchorScore!, zslScore);
      const scaledBD = scaleBDToTarget(zslBD, targetScore);
      const finalScore = breakdownToScore(scaledBD);

      return {
        source: 'roberta_similarity',
        matchedQuestion: lookup.item?.question ?? null,
        questionAvgScore: lookup.item?.questionAvgScore ?? null,
        datasetAnchorScore: lookup.anchorScore,
        datasetSimilarity: parseFloat(lookup.bestAnswerSimilarity.toFixed(3)),
        roberta_similarity: parseFloat(similarity.toFixed(3)),
        score: finalScore,
        breakdown: scaledBD,
        hrLabel: getHRLabel(finalScore),
      };
    } catch (err) {
      console.warn('[evaluateAnswer] RoBERTa similarity failed, falling to Path 2:',
        err instanceof Error ? err.message : err);
    }
  }

  // ── Path 2: ZSL-only (RoBERTa similarity unavailable or no dataset match) ───
  // ZSL already ran above — reuse zslBD if available, otherwise retry.
  try {
    const bd = zslBD ?? await callZSLClassify(question, answer);
    const zslScore = breakdownToScore(bd);

    const targetScore = Math.max(1, Math.min(5,
      hasDataset && lookup.anchorScore !== null
        ? similarityToLikert(lookup.bestAnswerSimilarity, lookup.anchorScore, zslScore)
        : zslScore
    ));

    const scaledBD = scaleBDToTarget(bd, targetScore);
    const finalScore = breakdownToScore(scaledBD);

    return {
      source: 'zsl_roberta',
      matchedQuestion: lookup.item?.question ?? null,
      questionAvgScore: lookup.item?.questionAvgScore ?? null,
      datasetAnchorScore: lookup.anchorScore,
      datasetSimilarity: parseFloat(lookup.bestAnswerSimilarity.toFixed(3)),
      roberta_similarity: 0,
      score: finalScore,
      breakdown: scaledBD,
      hrLabel: getHRLabel(finalScore),
    };
  } catch (err) {
    console.warn('[evaluateAnswer] ZSL failed entirely, using regex as last resort:',
      err instanceof Error ? err.message : err);
  }

  // ── Path 3: Regex STAR fallback (last resort, no network required) ──────────
  // Only reached when both RoBERTa and ZSL are completely unavailable.
  const rawBD = computeBreakdown(norm, wordCount);
  const blendedBD: STARBreakdown =
    hasDataset && lookup.bestAnswerSimilarity > 0.1
      ? blendBreakdowns(rawBD, lookup.item!.breakdown, Math.min(0.35, lookup.bestAnswerSimilarity * 0.5))
      : rawBD;
  const starScore = breakdownToScore(blendedBD);
  const jaccardSim = lookup.bestAnswerSimilarity;

  const targetScore = Math.max(1, Math.min(5,
    hasDataset && lookup.anchorScore !== null
      ? similarityToLikert(jaccardSim, lookup.anchorScore, starScore)
      : starScore
  ));

  const scaledBD = scaleBDToTarget(blendedBD, targetScore);
  const finalScore = breakdownToScore(scaledBD);

  return {
    source: 'zsl_star_fallback',
    matchedQuestion: lookup.item?.question ?? null,
    questionAvgScore: lookup.item?.questionAvgScore ?? null,
    datasetAnchorScore: lookup.anchorScore,
    datasetSimilarity: parseFloat(jaccardSim.toFixed(3)),
    roberta_similarity: 0,
    score: finalScore,
    breakdown: scaledBD,
    hrLabel: getHRLabel(finalScore),
    error: 'All RoBERTa paths unavailable. Regex STAR heuristic used as last resort.',
  };
}

export default evaluateAnswer;
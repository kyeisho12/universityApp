// ---------------------------------------------------------------------------
// robertaEvaluator.ts
//
// Evaluation pipeline — three paths in priority order:
//
//   Path 1 — RoBERTa Sentence Similarity (HuggingFace Inference API)
//             Model: sentence-transformers/all-roberta-large-v1
//             Computes cosine similarity between the student's answer and
//             the best HR-validated reference answer → 0–1 similarity score.
//             That score IS the "semantic similarity score (0–1) generated
//             by the RoBERTa model" described in the thesis.
//             Converted to 1–5 Likert via: anchorInfluence blending.
//
//   Path 2 — ZSL RoBERTa Classification (cross-encoder/nli-roberta-base)
//             Used when RoBERTa similarity is unavailable or no dataset match.
//             ZSL scores each STAR dimension independently via NLI model.
//
//   Path 3 — Regex STAR Fallback (local, no network required)
//             Last resort when both RoBERTa and ZSL are unavailable.
//             Uses regex heuristics to score each STAR dimension.
//
// PRE-SCORING GATES (applied before all paths):
//   1. Word count gate   — answers under 15 words → score 1 immediately
//   2. Negation gate     — answers that explicitly deny quality → cap at 2
//   3. Specificity score — token-level signals (numbers, named entities,
//                          strong verbs) used to penalize vague answers
//                          and prevent anchor inflation
//
// THE CONVERSION (thesis claim implemented literally):
//   anchorInfluence = min(0.9, (penalizedZslScore / 5) × 0.9) × similarity
//   score = penalizedZslScore × (1 − anchorInfluence)
//           + anchorScore × anchorInfluence
//   Likert = clamp(score, 1, 5)
//
// SCORE ↔ BREAKDOWN CONTRACT:
//   score is ALWAYS derived from breakdownToScore(finalBD) after scaling.
//   The pre-scaling float is used only as the target for scaleBDToTarget().
//   This guarantees the displayed breakdown average always equals the score.
// ---------------------------------------------------------------------------

import robertaDataset, { DatasetItem, STARBreakdown } from '../data/robertaDataset';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

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
  score: number;               // final 1–5 Likert output — always equals breakdownToScore(breakdown)
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
    .replace(/["'`.,()—]/g, '')   // remove punctuation (not hyphens)
    .replace(/-/g, ' ')            // hyphen → space so "re-structured" → "re structured"
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
// Labels require specificity — forces the NLI model to penalize vague/generic
// answers. [0]=strong(5): must have concrete detail  [1]=partial(3): general but present  [2]=absent(1)
const ZSL_LABELS: Record<keyof STARBreakdown, string[]> = {
  situation:  ['describes a specific real past event with concrete context', 'mentions a general background with no specific event', 'no situation or context mentioned at all'],
  task:       ['states a specific concrete role or responsibility they held', 'vaguely mentions wanting or trying something without a clear role', 'no role task or responsibility mentioned at all'],
  action:     ['describes specific concrete steps or actions they personally took', 'mentions generic effort or attitude with no specific actions', 'no action or effort of any kind described'],
  result:     ['states a concrete measurable or clearly observable outcome', 'expresses a vague hope wish or assumption about outcome', 'no result outcome or impact mentioned at all'],
  reflection: ['states a specific lesson or insight gained from a real experience', 'expresses a general desire to grow with no real experience behind it', 'no reflection learning or self-awareness mentioned at all'],
};

// Dimension-specific focus questions — appended to the NLI input per dimension.
// This steers the model to evaluate a targeted hypothesis for each STAR component
// rather than the same generic text for all five, producing genuinely different
// probability distributions and thus varied per-dimension scores.
const FOCUS_QUESTIONS: Record<keyof STARBreakdown, string> = {
  situation:  'Does this answer describe a specific past situation or event with context?',
  task:       'Does this answer clearly state the role or responsibility the speaker held?',
  action:     'Does this answer describe concrete steps or actions personally taken?',
  result:     'Does this answer provide a measurable or clearly observable outcome?',
  reflection: 'Does this answer share a specific lesson or insight gained from experience?',
};

// Weighted average — stable because probabilities sum to ~1.
// strong→5, partial→3, absent→1. No subtraction, no clamping issues.
function probabilityToLikert(strong: number, mid: number, weak: number): number {
  return Math.max(1, Math.min(5, Math.round(strong * 5 + mid * 3 + weak * 1)));
}

// Classify a single STAR dimension with its own focus question.
// Each dimension call appends a different focus question to the shared base text,
// so the NLI model evaluates a distinct hypothesis per STAR component.
async function classifyDimension(
  dim: keyof STARBreakdown,
  baseText: string
): Promise<[keyof STARBreakdown, number]> {
  const controller = new AbortController();
  const tid = window.setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
  // Append the dimension-specific focus question to the base text.
  const text = `${baseText}
${FOCUS_QUESTIONS[dim]}`.slice(0, 650);
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

    if (!data.labels || !data.scores) throw new Error('Invalid ZSL response');

    const labelIdx = (label: string) => (data.labels as string[]).indexOf(label);
    const strongIdx = labelIdx(ZSL_LABELS[dim][0]);
    const midIdx    = labelIdx(ZSL_LABELS[dim][1]);
    const weakIdx   = labelIdx(ZSL_LABELS[dim][2]);

    const strong = strongIdx >= 0 ? data.scores[strongIdx] : 0;
    const mid    = midIdx    >= 0 ? data.scores[midIdx]    : 0;
    const weak   = weakIdx   >= 0 ? data.scores[weakIdx]   : 0;

    return [dim, probabilityToLikert(strong, mid, weak)];
  } finally {
    window.clearTimeout(tid);
  }
}

async function callZSLClassify(
  question: string,
  answer: string
): Promise<STARBreakdown> {
  if (!BACKEND_URL) throw new Error('VITE_BACKEND_URL is not set.');

  // Base text shared across all dimension calls — each gets its own focus question appended.
  const baseText = `Question: ${question}
Answer: ${answer}`.slice(0, 600);

  const dims = ['situation', 'task', 'action', 'result', 'reflection'] as (keyof STARBreakdown)[];

  const dimScores: [keyof STARBreakdown, number][] = [];
  for (const dim of dims) {
    const result = await classifyDimension(dim, baseText);
    dimScores.push(result);
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
// Used by Path 2 and Path 3 as a fallback blending function.
// ---------------------------------------------------------------------------

function similarityToLikert(
  similarity: number,
  anchorScore: number,
  starScore: number
): number {
  const anchorWeight = Math.min(0.90, similarity * 0.90);
  const starWeight   = 1 - anchorWeight;
  return Math.max(1, Math.min(5,
    anchorScore * anchorWeight + starScore * starWeight
  ));
}

// ---------------------------------------------------------------------------
// Specificity Detector
// ---------------------------------------------------------------------------

function computeSpecificityScore(norm: string, wordCount: number): number {
  let score = 0;

  const numbers = norm.match(/\b\d+\b/g) ?? [];
  score += Math.min(2, numbers.length) * 0.3;

  const strongActions = /\b(implemented|developed|designed|led|created|built|organized|resolved|coordinated|launched|redesigned|trained|mentored|executed|deployed|spearheaded|initiated|restructured|formulated|overhauled|streamlined|automated|standardized|integrated|revamped|transformed|established|facilitated|supervised|directed)\b/;
  if (strongActions.test(norm)) score += 0.3;

  const roleContext = /\b(ojt|internship|clinical|rotation|thesis|capstone|practicum|assigned|responsible for|in charge of|my role|my task|my responsibility|student teaching|field work|community extension)\b/;
  if (roleContext.test(norm)) score += 0.2;

  const namedContext = /\b(hospital|company|school|university|department|ward|firm|office|bureau|agency|clinic|laboratory|center|institution|organization)\b/;
  if (namedContext.test(norm)) score += 0.1;

  const recognition = /\b(supervisor|professor|adviser|ci|instructor|manager|teacher|mentor) (commended|praised|mentioned|thanked|approved|said|told me|noted|recognized)\b/;
  if (recognition.test(norm)) score += 0.1;

  const fillerMatches = norm.match(
    /\b(i think|i believe|i feel|i guess|i hope|i suppose|maybe|kind of|sort of|someday|whatever|anything|everything|everyone|someone|somehow|somewhere|sometime|generally|usually|sometimes|often|always|never|just want|just do|just did|just try)\b/g
  ) ?? [];
  const fillerRatio = fillerMatches.length / wordCount;
  score -= fillerRatio * 2;

  return Math.max(0, Math.min(1, score));
}

// ---------------------------------------------------------------------------
// Negation Detector
// ---------------------------------------------------------------------------

function isNegatingAnswer(norm: string): boolean {
  const negationPattern = /\b(i (didn't|didnt|don't|dont|did not|do not) (really|think|have|know|feel|make|do|consider|believe i)|i just (did|wanted|finished|completed|went|showed up|helped|did what)|nothing (special|major|significant|notable|big|extraordinary)|not (really|anything|much|significant|anything special)|wasn't (anything|really|that) (special|big|major|significant|notable)|i (only|merely|barely) (did|finished|completed|helped|participated)|just (the simple|what was required|what was expected|my part|wanted it done)|i don't think i have|i haven't really|i didn't really make)\b/;
  return negationPattern.test(norm);
}

// ---------------------------------------------------------------------------
// Dataset lookup
// ---------------------------------------------------------------------------

export interface DatasetLookupResult {
  item: DatasetItem | null;
  questionSimilarity: number;
  anchorScore: number | null;
  bestAnswerSimilarity: number;
  topAnswer: string | null;
}

export function lookupDataset(question: string, candidateAnswer: string): DatasetLookupResult {
  if (!robertaDataset || !Array.isArray(robertaDataset) || robertaDataset.length === 0) {
    return { item: null, questionSimilarity: 0, anchorScore: null, bestAnswerSimilarity: 0, topAnswer: null };
  }

  const qTokens = tokenSet(question);
  const aTokens = tokenSet(candidateAnswer);

  let bestItem: DatasetItem | null = null;
  let bestQSim = 0;
  for (const it of robertaDataset) {
    const sim = jaccard(qTokens, tokenSet(it.question));
    if (sim > bestQSim) { bestQSim = sim; bestItem = it; }
  }

  console.debug(`[lookupDataset] question="${question.slice(0, 40)}" bestQSim=${bestQSim.toFixed(3)} matched="${bestItem?.question?.slice(0, 40) ?? 'none'}"`);

  if (!bestItem || bestQSim < DATASET_MATCH_THRESHOLD) {
    return { item: null, questionSimilarity: bestQSim, anchorScore: null, bestAnswerSimilarity: 0, topAnswer: null };
  }

  const scored = bestItem.answers
    .map(ans => ({ similarity: jaccard(aTokens, tokenSet(ans.text)), avgScore: ans.avgScore, text: ans.text }))
    .sort((a, b) => b.similarity - a.similarity);

  const topK = scored.slice(0, TOP_K_ANSWERS).filter(s => s.similarity > 0);
  const topByScore = [...bestItem.answers].sort((a, b) => b.avgScore - a.avgScore)[0];

  if (!topK.length) {
    return {
      item: bestItem, questionSimilarity: bestQSim,
      anchorScore: null, bestAnswerSimilarity: 0,
      topAnswer: topByScore?.text ?? null,
    };
  }

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
// STAR Scoring — regex fallback (Path 3 only)
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
    situation:  Math.min(5, Math.max(1, a.situation  * aw + b.situation  * bWeight)),
    task:       Math.min(5, Math.max(1, a.task       * aw + b.task       * bWeight)),
    action:     Math.min(5, Math.max(1, a.action     * aw + b.action     * bWeight)),
    result:     Math.min(5, Math.max(1, a.result     * aw + b.result     * bWeight)),
    reflection: Math.min(5, Math.max(1, a.reflection * aw + b.reflection * bWeight)),
  };
}

function breakdownToScore(bd: STARBreakdown): number {
  return parseFloat(((bd.situation + bd.task + bd.action + bd.result + bd.reflection) / 5).toFixed(2));
}

function scaleBDToTarget(bd: STARBreakdown, targetScore: number): STARBreakdown {
  const dims = ['situation', 'task', 'action', 'result', 'reflection'] as (keyof STARBreakdown)[];
  const avg = dims.reduce((s, d) => s + bd[d], 0) / 5;
  const delta = targetScore - avg;

  if (Math.abs(delta) < 0.01) return { ...bd };

  const gaps = dims.map(d => Math.abs(targetScore - bd[d]));
  const totalGap = gaps.reduce((s, g) => s + g, 0);

  let scaled: Partial<STARBreakdown> = {};
  if (totalGap < 0.01) {
    for (const d of dims) scaled[d] = Math.min(5, Math.max(1, bd[d] + delta));
  } else {
    for (let i = 0; i < dims.length; i++) {
      const correction = delta * (gaps[i] / totalGap) * dims.length;
      scaled[dims[i]] = Math.min(5, Math.max(1, Math.round(bd[dims[i]] + correction)));
    }
  }

  return scaled as STARBreakdown;
}

// ---------------------------------------------------------------------------
// Public evaluate function
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Public evaluate function
//
// isFollowUp — pass true when the question is a follow-up (source === 'followup').
//   Follow-up answers are contextual/reflective by nature and will not contain
//   OJT/number/strong-verb signals even when high quality, so the specificity
//   cap is bypassed and the length-penalty floor is relaxed to 30 words.
//   The caller (MockInterviewPage) already knows this from question.source —
//   no regex detection is needed here.
// ---------------------------------------------------------------------------

export async function evaluateAnswer(
  question: string,
  answer: string,
  isFollowUp = false
): Promise<EvaluationResult> {
  const norm = normalizeText(answer);
  const wordCount = norm.split(/\s+/).filter(Boolean).length;

  if (wordCount < 15) {
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

  const isNegating = isNegatingAnswer(norm);
  const specificityScore = computeSpecificityScore(norm, wordCount);

  // Follow-up answers are shorter and lack OJT/number signals by design.
  // Relax the length-penalty floor and skip the specificity cap entirely.
  const lengthPenaltyFloor = isFollowUp ? 25 : 40;

  const lookup = lookupDataset(question, answer);
  const hasDataset = lookup.item !== null && lookup.anchorScore !== null;

  let zslBD: STARBreakdown | null = null;
  try {
    zslBD = await callZSLClassify(question, answer);
  } catch (err) {
    console.warn('[evaluateAnswer] ZSL pre-call failed, will retry in Path 2:',
      err instanceof Error ? err.message : err);
  }

  // Path 1
  if (hasDataset && lookup.topAnswer && zslBD) {
    try {
      const similarity = await callRoBERTaSimilarity(question, answer, lookup.topAnswer);
      const zslScore = breakdownToScore(zslBD);
      const lengthFactor = specificityScore > 0.3
        ? 1.0
        : Math.min(1.0, wordCount / lengthPenaltyFloor);
      const penalizedZslScore = zslScore * lengthFactor;

      if (penalizedZslScore < 2.0) {
        const targetScore = isNegating ? Math.min(penalizedZslScore, 2) : penalizedZslScore;
        const finalScore = targetScore;
        const finalBD = scaleBDToTarget(zslBD, finalScore); // scale raw ZSL to match final score
        return {
          source: 'roberta_similarity',
          matchedQuestion: lookup.item?.question ?? null,
          questionAvgScore: lookup.item?.questionAvgScore ?? null,
          datasetAnchorScore: lookup.anchorScore,
          datasetSimilarity: parseFloat(lookup.bestAnswerSimilarity.toFixed(3)),
          roberta_similarity: parseFloat(similarity.toFixed(3)),
          score: finalScore,
          breakdown: finalBD,
          hrLabel: getHRLabel(finalScore),
          ...(isNegating && { error: 'Answer flagged as self-dismissive or negating.' }),
        };
      }

      const anchorInfluence = Math.min(0.9, (penalizedZslScore / 5) * 0.9) * similarity;
      const blendedScore = Math.max(1, Math.min(5,
        penalizedZslScore * (1 - anchorInfluence) + lookup.anchorScore! * anchorInfluence
      ));

      // Specificity cap — skipped for follow-up questions so ZSL scores freely.
      const similarityCap = isFollowUp ? 5
        : similarity < 0.40 && specificityScore < 0.2 ? 2
        : similarity < 0.55 && specificityScore < 0.3 ? 3
        : similarity < 0.70 ? 4
        : 5;

      const cappedScore  = Math.min(blendedScore, similarityCap);
      const targetScore  = isNegating ? Math.min(cappedScore, 2) : cappedScore;
      const finalScore = targetScore;
      const finalBD = scaleBDToTarget(zslBD, finalScore); // scale raw ZSL to match final score

      return {
        source: 'roberta_similarity',
        matchedQuestion: lookup.item?.question ?? null,
        questionAvgScore: lookup.item?.questionAvgScore ?? null,
        datasetAnchorScore: lookup.anchorScore,
        datasetSimilarity: parseFloat(lookup.bestAnswerSimilarity.toFixed(3)),
        roberta_similarity: parseFloat(similarity.toFixed(3)),
        score: finalScore,
        breakdown: finalBD,
        hrLabel: getHRLabel(finalScore),
        ...(isNegating && { error: 'Answer flagged as self-dismissive or negating.' }),
      };
    } catch (err) {
      console.warn('[evaluateAnswer] RoBERTa similarity failed, falling to Path 2:',
        err instanceof Error ? err.message : err);
    }
  }

  // Path 2 — primary path for all follow-up questions (no dataset match)
  try {
    const bd = zslBD ?? await callZSLClassify(question, answer);
    const zslScore = breakdownToScore(bd);
    const lengthFactor = specificityScore > 0.3
      ? 1.0
      : Math.min(1.0, wordCount / lengthPenaltyFloor);
    const penalizedZslScore = zslScore * lengthFactor;

    const rawTarget = Math.max(1, Math.min(5,
      hasDataset && lookup.anchorScore !== null
        ? similarityToLikert(lookup.bestAnswerSimilarity, lookup.anchorScore, penalizedZslScore)
        : penalizedZslScore
    ));

    // Specificity cap — skipped for follow-up questions so ZSL scores freely.
    const path2Cap = isFollowUp ? 5
      : specificityScore < 0.2 ? 2
      : specificityScore < 0.3 ? 3
      : specificityScore < 0.5 ? 4
      : 5;

    const cappedTarget  = Math.min(rawTarget, path2Cap);
    const targetScore   = isNegating ? Math.min(cappedTarget, 2) : cappedTarget;
    const finalScore = targetScore;
    const finalBD = bd ? scaleBDToTarget(bd, finalScore) : { situation: 1, task: 1, action: 1, result: 1, reflection: 1 }; // scale raw ZSL to match final score

    return {
      source: 'zsl_roberta',
      matchedQuestion: lookup.item?.question ?? null,
      questionAvgScore: lookup.item?.questionAvgScore ?? null,
      datasetAnchorScore: lookup.anchorScore,
      datasetSimilarity: parseFloat(lookup.bestAnswerSimilarity.toFixed(3)),
      roberta_similarity: 0,
      score: finalScore,
      breakdown: finalBD,
      hrLabel: getHRLabel(finalScore),
      ...(isNegating && { error: 'Answer flagged as self-dismissive or negating.' }),
    };
  } catch (err) {
    console.warn('[evaluateAnswer] ZSL failed entirely, using regex as last resort:',
      err instanceof Error ? err.message : err);
  }

  // Path 3
  const rawBD = computeBreakdown(norm, wordCount);
  const blendedBD: STARBreakdown =
    hasDataset && lookup.bestAnswerSimilarity > 0.1
      ? blendBreakdowns(rawBD, lookup.item!.breakdown, Math.min(0.35, lookup.bestAnswerSimilarity * 0.5))
      : rawBD;
  const starScore = breakdownToScore(blendedBD);
  const jaccardSim = lookup.bestAnswerSimilarity;

  const rawTarget = Math.max(1, Math.min(5,
    hasDataset && lookup.anchorScore !== null
      ? similarityToLikert(jaccardSim, lookup.anchorScore, starScore)
      : starScore
  ));

  const targetScore = isNegating ? Math.min(rawTarget, 2) : rawTarget;
  const finalScore = targetScore;
  const finalBD = scaleBDToTarget(blendedBD, finalScore); // scale regex breakdown to match final score

  return {
    source: 'zsl_star_fallback',
    matchedQuestion: lookup.item?.question ?? null,
    questionAvgScore: lookup.item?.questionAvgScore ?? null,
    datasetAnchorScore: lookup.anchorScore,
    datasetSimilarity: parseFloat(jaccardSim.toFixed(3)),
    roberta_similarity: 0,
    score: finalScore,
    breakdown: finalBD,
    hrLabel: getHRLabel(finalScore),
    error: isNegating
      ? 'Answer flagged as self-dismissive or negating.'
      : 'All RoBERTa paths unavailable. Regex STAR heuristic used as last resort.',
  };
}

export default evaluateAnswer;
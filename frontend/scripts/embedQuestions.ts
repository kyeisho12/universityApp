// ---------------------------------------------------------------------------
// scripts/embedQuestions.ts
//
// ONE-TIME script. Run this once to pre-compute RoBERTa embeddings for every
// dataset question. The output is a generated file you drop into your project.
//
// Prerequisites:
//   npm install tsx node-fetch   (or use ts-node if you prefer)
//
// Usage:
//   VITE_BACKEND_URL=https://your-backend.onrender.com npx tsx scripts/embedQuestions.ts
//
// Output:
//   src/data/questionEmbeddings.generated.ts   ← auto-generated, do not edit
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config — reads the same env var your app uses
// ---------------------------------------------------------------------------
let BACKEND_URL = (process.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '');
if (!BACKEND_URL) {
  console.error('❌  Set VITE_BACKEND_URL before running this script.');
  console.error('    PowerShell:  $env:VITE_BACKEND_URL="https://your-app.railway.app"; npx tsx scripts/embedQuestions.ts');
  process.exit(1);
}
// Ensure https:// prefix
if (!BACKEND_URL.startsWith('http')) BACKEND_URL = 'https://' + BACKEND_URL;

const TIMEOUT_MS  = 90_000;   // 90 s — covers Railway cold start + HF warm-up
const RETRY_LIMIT = 3;
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/questionEmbeddings.generated.ts');

// ---------------------------------------------------------------------------
// All 31 dataset questions (must match robertaDataset.ts order exactly)
// ---------------------------------------------------------------------------
const QUESTIONS: string[] = [
  'Are you a risk taker?',
  'Are you a team player?',
  'Do you prefer hard work or smart work?',
  'Give an example of how you have handled a challenge in school or workplace before.',
  'Give an example of when you performed well under pressure.',
  'Give an example of when you showed leadership qualities.',
  "Give examples of ideas you've had or implemented.",
  'How do you deal with pressure or stressful situations?',
  'How do you feel about working weekends or late hours?',
  'How do you want to improve yourself in the next year?',
  'How quickly do you adapt to new technology?',
  'Tell me about a time when you had to give someone difficult feedback. How did you handle it?',
  'Tell me something about yourself.',
  'What are you looking for in terms of career development?',
  'What are your biggest strengths?',
  'What do you think our company/organization could do better?',
  'What is your biggest weakness?',
  'What is your greatest failure and what did you learn from it?',
  "What is your professional achievement you're most proud of?",
  'What kind of goals would you have in mind if you got this job?',
  'What kind of work environment do you like best?',
  'What would your first 30, 60, or 90 days look like in this role?',
  'Where do you see yourself in five years?',
  'Who has impacted you most in your career and how?',
  'Who has impacted you most in your career and how? (2)',
  'Who has impacted you most in your career and how? (closing)',
  'Why should we hire you?',
  'Give an example of how you have handled a challenge in school/workplace.',
  'Tell me about a time you gave someone difficult feedback.',
  'What is your greatest failure and what did you learn?',
  'Who has impacted you most in your career and how? (Follow-up)',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mean(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i++) out[i] += v[i];
  return out.map(x => x / vectors.length);
}

function toSentenceEmbedding(raw: number[] | number[][]): number[] {
  if (typeof raw[0] === 'number') return raw as number[];
  return mean(raw as number[][]);
}

async function embedWithRetry(text: string, attempt = 1): Promise<number[]> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BACKEND_URL}/api/hf-embed`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ inputs: [text] }),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      throw new Error(`HTTP ${res.status} — ${body}`);
    }

    const data = await res.json() as (number[] | number[][])[];
    return toSentenceEmbedding(data[0]);

  } catch (err) {
    if (attempt < RETRY_LIMIT) {
      const wait = attempt * 3000;
      console.warn(`  ⚠️  Attempt ${attempt} failed — retrying in ${wait / 1000}s…`);
      await new Promise(r => setTimeout(r, wait));
      return embedWithRetry(text, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(tid);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🔗  Backend: ${BACKEND_URL}`);
  console.log(`📝  Embedding ${QUESTIONS.length} questions…\n`);

  const results: Record<string, number[]> = {};

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${QUESTIONS.length}] "${q.slice(0, 60)}"… `);

    try {
      const embedding = await embedWithRetry(q);
      results[q] = embedding;
      console.log(`✅  (dim=${embedding.length})`);
    } catch (err) {
      console.error(`\n  ❌  Failed after ${RETRY_LIMIT} attempts:`, err);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Write generated TypeScript file
  // -------------------------------------------------------------------------
  const lines: string[] = [
    '// ---------------------------------------------------------------------------',
    '// questionEmbeddings.generated.ts',
    '//',
    '// AUTO-GENERATED — do not edit by hand.',
    '// Regenerate with:  npx tsx scripts/embedQuestions.ts',
    '//',
    `// Generated: ${new Date().toISOString()}`,
    `// Model:     sentence-transformers/all-roberta-large-v1`,
    `// Questions: ${QUESTIONS.length}`,
    '// ---------------------------------------------------------------------------',
    '',
    '// Maps each dataset question string → its RoBERTa sentence embedding.',
    'const questionEmbeddings: Record<string, number[]> = {',
  ];

  for (const [q, emb] of Object.entries(results)) {
    // Compact float representation — 6 decimal places is plenty for cosine sim
    const compact = '[' + emb.map(v => v.toFixed(6)).join(',') + ']';
    lines.push(`  ${JSON.stringify(q)}: ${compact},`);
  }

  lines.push('};', '', 'export default questionEmbeddings;', '');

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');

  const kb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`\n✅  Written to: ${OUTPUT_PATH}  (${kb} KB)`);
  console.log('\nNext steps:');
  console.log('  1. Add questionEmbedding field to DatasetItem (see robertaDataset.ts patch)');
  console.log('  2. Import questionEmbeddings in robertaEvaluator.ts (see lookupDataset patch)');
  console.log('  Done — question matching now uses semantic similarity.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
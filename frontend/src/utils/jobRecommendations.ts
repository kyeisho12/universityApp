import type { JobWithEmployer } from '../services/jobService';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'this', 'that', 'these', 'those',
  'it', 'its', 'we', 'you', 'your', 'our', 'they', 'their', 'he', 'she', 'his',
  'her', 'who', 'what', 'which', 'when', 'where', 'how', 'not', 'no', 'nor',
  'so', 'yet', 'both', 'either', 'neither', 'also', 'just', 'more', 'most',
  'other', 'into', 'than', 'then', 'about', 'above', 'after', 'all', 'any',
  'each', 'few', 'must', 'only', 'own', 'same', 'such', 'too', 'very',
  'during', 'before', 'through', 'up', 'out', 'off', 'over', 'under',
  'again', 'further', 'once', 'na', 'none',
]);

function tokenize(text: unknown): string[] {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

// Build IDF map from a corpus of tokenized documents
function buildIdf(corpus: string[][]): Map<string, number> {
  const N = corpus.length;
  const df = new Map<string, number>();
  for (const doc of corpus) {
    const seen = new Set(doc);
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    // Smoothed IDF: log((N+1)/(freq+1)) + 1
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
  }
  return idf;
}

// Build a TF-IDF vector for a tokenized document
function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  if (tokens.length === 0) return new Map();
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  const vector = new Map<string, number>();
  for (const [term, count] of tf) {
    const tfScore = count / tokens.length;
    const idfScore = idf.get(term) ?? 1;
    vector.set(term, tfScore * idfScore);
  }
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, val] of a) {
    dot += val * (b.get(term) ?? 0);
    normA += val * val;
  }
  for (const [, val] of b) {
    normB += val * val;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RecommendedJob {
  job: JobWithEmployer;
  score: number;
  matchedSkills: string[];
}

const MIN_SCORE_THRESHOLD = 0.05;

export function computeJobRecommendations(
  jobs: JobWithEmployer[],
  userData: Record<string, any> | null | undefined,
  userResumes: Record<string, any>[],
  appliedJobIds: Set<string>
): RecommendedJob[] {
  if (!jobs.length) return [];

  // --- Build user document ---
  const userParts: unknown[] = [];

  // Skills from profile (repeat 3x to boost their TF weight)
  const profileSkills: string[] = [];
  if (Array.isArray(userData?.skills)) {
    profileSkills.push(...userData.skills.map(String));
  } else if (userData?.skills) {
    profileSkills.push(...String(userData.skills).split(/[\n,]/g).map(s => s.trim()).filter(Boolean));
  }
  if (Array.isArray(userData?.skills_entries)) {
    profileSkills.push(
      ...userData.skills_entries.map((e: any) => e.skill || e).filter(Boolean).map(String)
    );
  }

  // Resume skills (repeat 3x as well)
  const resumeSkills: string[] = Array.isArray(userResumes[0]?.skills) ? userResumes[0].skills : [];
  const allSkills = [...profileSkills, ...resumeSkills];
  userParts.push(...allSkills, ...allSkills, ...allSkills);

  // Education
  if (Array.isArray(userData?.education_entries)) {
    userData.education_entries.forEach((e: any) => userParts.push(e.degree, e.field, e.school));
  } else {
    userParts.push(userData?.major);
  }

  // Work experience
  if (Array.isArray(userData?.work_experience_entries)) {
    userData.work_experience_entries.forEach((w: any) =>
      userParts.push(w.title, w.company, w.description)
    );
  } else {
    userParts.push(userData?.work_experience);
  }

  userParts.push(userData?.bio, userResumes[0]?.file_name);

  // Full resume text (extracted by pdfplumber on upload)
  if (typeof userResumes[0]?.resume_text === 'string' && userResumes[0].resume_text.length > 0) {
    userParts.push(...userResumes[0].resume_text.split(/\s+/).slice(0, 500));
  }

  // Guard: need at least skills, meaningful resume text, OR enough profile data
  const hasResumeText = typeof userResumes[0]?.resume_text === 'string'
    && userResumes[0].resume_text.trim().length > 100;
  const hasProfileContent = userParts.filter(p => typeof p === 'string' && p.trim().length > 1).length >= 3;
  if (allSkills.length === 0 && !hasResumeText && !hasProfileContent) return [];

  const userTokens = userParts.flatMap(p => tokenize(p));
  const uniqueUserTokens = new Set(userTokens);

  if (uniqueUserTokens.size < 3) return [];

  // --- Build job documents (exclude already-applied jobs) ---
  const eligibleJobs = jobs.filter(j => !appliedJobIds.has(j.id ?? ''));
  if (!eligibleJobs.length) return [];

  const jobTokensArray = eligibleJobs.map(job => {
    const requirements = Array.isArray(job.requirements) ? job.requirements : [];
    return tokenize([job.title, job.description, job.category, ...requirements].join(' '));
  });

  // --- Compute TF-IDF ---
  const idf = buildIdf(jobTokensArray);
  const userVector = tfidfVector(userTokens, idf);

  // Preferences for a small additive boost (max +0.1 on top of cosine score)
  const preferredJobTypes: string[] = Array.isArray(userData?.preferred_job_types)
    ? userData.preferred_job_types.filter(Boolean)
    : [];
  const preferredLocations: string[] = Array.isArray(userData?.preferred_locations)
    ? userData.preferred_locations.filter(Boolean)
    : [];
  const preferredIndustries: string[] = Array.isArray(userData?.preferred_industries)
    ? userData.preferred_industries.filter(Boolean)
    : [];

  return eligibleJobs
    .map((job, i) => {
      const jobVector = tfidfVector(jobTokensArray[i], idf);
      const similarity = cosineSimilarity(userVector, jobVector);

      // Preference boost
      let prefMatches = 0;
      let prefTotal = 0;
      if (preferredJobTypes.length) {
        prefTotal++;
        if (preferredJobTypes.some(t => t === job.job_type)) prefMatches++;
      }
      if (preferredLocations.length) {
        prefTotal++;
        if (preferredLocations.some(loc =>
          String(job.location).toLowerCase().includes(loc.toLowerCase())
        )) prefMatches++;
      }
      if (preferredIndustries.length) {
        prefTotal++;
        if (preferredIndustries.some(ind =>
          String(job.category).toLowerCase().includes(ind.toLowerCase())
        )) prefMatches++;
      }
      const preferenceBoost = prefTotal > 0 ? 0.1 * (prefMatches / prefTotal) : 0;

      const score = similarity + preferenceBoost;

      // Which requirements overlap with user keywords (for display)
      const requirements = Array.isArray(job.requirements) ? job.requirements : [];
      const matchedSkills = requirements
        .filter(req => tokenize(req).some(t => uniqueUserTokens.has(t)))
        .slice(0, 3);

      return { job, score, matchedSkills };
    })
    .filter(({ score }) => score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

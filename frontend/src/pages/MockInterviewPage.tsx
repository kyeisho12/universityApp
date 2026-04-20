import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video,
  CheckCircle,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ChevronRight,
  Volume2,
  RotateCcw,
  Square,
  Sparkles,
  Bot,
  PlayCircle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Loader2,
  Download,
  ShieldAlert,
} from "lucide-react";
import evaluateAnswer from "../utils/robertaEvaluator";
import { Sidebar } from "../components/common/Sidebar";
import { useMessageBox } from "../components/common/MessageBoxProvider";
import { useAuth } from "../hooks/useAuth";
import { useStudent } from "../context/StudentContext";
import { supabase, supabaseUrl, supabaseAnonKey } from "../lib/supabaseClient";
import {
  decideNextQuestionStep,
  getLatestQuestionTranscript,
  getMockInterviewQuestionsExcluding,
  getQuestionById,
  getPreferredOpeningQuestion,
  insertRecordingSegmentMetadata,
  rateQuestion,
  startInterviewSession,
  triggerPendingSessionTranscriptions,
  triggerSegmentTranscription,
  transcribeLiveAudioChunk,
  updateInterviewSessionProgress,
  updateInterviewSessionStatus,
  uploadInterviewRecordingSegment,
  voidInterviewSession,
  deleteSegmentsForQuestion,
} from "../services/interviewService";
import {
  getSpeechRecognitionAPI,
  isSpeechRecognitionSupported,
  isBraveBrowser,
  getBrowserSpecificInstructions,
} from "../utils/speechRecognitionCompat";

type NavigateHandler = (route: string) => void;

interface MockInterviewPageContentProps {
  email: string;
  userName: string;
  userId: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

interface Question {
  id: string;
  type: string;
  question: string;
  tip: string;
  source?: "fixed" | "bank" | "followup";
  baseQuestionId?: string;
}

interface ActiveSegmentMeta {
  sessionId: string;
  storagePrefix: string;
  questionId: string | null;
  questionIndex: number;
  segmentOrder: number;
  startedAt: number;
  baselineDraftChars: number;
  baselineLiveChars: number;
}

type ExcludingQuestionsArgs = {
  limit?: number;
  excludeIds?: string[];
};

type DecideNextQuestionArgs = {
  currentQuestion: string;
  candidateAnswer: string;
  category?: string;
  idealAnswer?: string;
  remainingBankQuestions?: number;
  followupCountForCurrent?: number;
  bankQuestionPool?: { id: string; question: string }[];
  evaluationSource?: string;
  conversationHistory?: { question: string; answer: string }[];
};

const getMockInterviewQuestionsExcludingTyped =
  getMockInterviewQuestionsExcluding as (args?: ExcludingQuestionsArgs) => Promise<any>;

const decideNextQuestionStepTyped =
  decideNextQuestionStep as (args: DecideNextQuestionArgs) => Promise<any>;

type PreparedNextAction =
  | {
      kind: "followup";
      question: Question;
      nextQuestionIndex: number;
      baseQuestionId: string;
    }
  | {
      kind: "bank";
      question: Question;
      nextQuestionIndex: number;
      remainingPool: Question[];
    }
  | {
      kind: "complete";
      message: string;
      completionReason: "score_threshold" | "question_cap" | "exhausted" | "manual";
    };

interface PersistedMockInterviewState {
  hasStarted: boolean;
  isSessionStarted: boolean;
  isPaused?: boolean;
  isPauseTranscriptPending?: boolean;
  isCompleted: boolean;
  currentQuestion: number;
  isCameraOn: boolean;
  isMicOn: boolean;
  sessionId?: string | null;
  storagePrefix?: string | null;
  savedSegmentCount?: number;
  liveDraftTranscript?: string;
  liveTranscriptText?: string | null;
  latestWhisperStatus?: string | null;
  preparedNextAction?: PreparedNextAction | null;
  questions?: Question[];
  bankQuestionPool?: Question[];
  followupCountByBase?: Record<string, number>;
}

interface SessionHistoryItem {
  id: string;
  status: string;
  totalQuestions: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  score: number | null;
  evaluatedCount: number | null;
}

interface StudentSegment {
  id: string;
  question_id: string | null;
  question_index: number | null;
  segment_order: number | null;
  storage_path: string | null;
  mime_type: string | null;
  transcript_text: string | null;
  whisper_status: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  signedUrl: string | null;
  questionText: string;
  evaluation: any | null;
}

function normalizeQuestionKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEmergencyFollowupQuestion(candidateAnswer: string, originalQuestion: string): string {
  const answer = (candidateAnswer || "").trim().toLowerCase();
  const question = (originalQuestion || "").trim().toLowerCase();

  const futureMarkers = [
    "five years", "10 years", "ten years", "see yourself", "your goal",
    "career goal", "where do you want", "what do you want to", "plan to",
    "aspire", "ambition", "future", "long-term", "short-term", "hope to",
    "would like to", "looking to", "aim to", "next step",
  ];
  const isFutureQuestion = futureMarkers.some((m) => question.includes(m));

  if (isFutureQuestion) {
    if (answer.length < 30) return "What specific steps are you planning to take to reach that goal?";
    if (["challenge", "difficult", "obstacle", "barrier"].some((k) => answer.includes(k)))
      return "What do you think will be your biggest obstacle in getting there, and how do you plan to handle it?";
    if (["result", "outcome", "achieve", "success", "grow", "improve"].some((k) => answer.includes(k)))
      return "How will you measure your progress toward that goal?";
    return "What skill or experience do you think you still need to develop to get there?";
  }

  if (answer.length < 30) {
    return "Can you walk me through one specific example and what you personally did?";
  }
  if (
    answer.includes("result") ||
    answer.includes("outcome") ||
    answer.includes("impact") ||
    answer.includes("improved") ||
    answer.includes("increased")
  ) {
    return "What metric or concrete evidence best proves that impact?";
  }
  if (
    answer.includes("challenge") ||
    answer.includes("difficult") ||
    answer.includes("problem") ||
    answer.includes("issue")
  ) {
    return "What was the hardest decision you made in that situation, and why?";
  }
  const fallbacks = [
    "What was the most important factor in your decision-making process there?",
    "How did you validate that your approach was working as expected?",
    "What would you tell someone facing a similar situation?",
    "What aspect of that experience do you think was most critical to the outcome?",
    "How did you know you were on the right track during that process?",
  ];
  return fallbacks[answer.length % fallbacks.length];
}

const SIMILARITY_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to",
  "for", "of", "and", "or", "you", "your", "what", "how", "did", "do",
  "that", "this", "with", "have", "it", "be", "me", "my", "about",
  "can", "tell", "give", "us", "when", "why", "has", "had",
]);

function findSimilarBankQuestion(generatedQuestion: string, bankPool: Question[]): Question | null {
  const words1 = normalizeQuestionKey(generatedQuestion)
    .split(" ")
    .filter((w) => w.length > 2 && !SIMILARITY_STOPWORDS.has(w));
  if (words1.length === 0) return null;
  const set1 = new Set(words1);

  let bestMatch: Question | null = null;
  let bestScore = 0;

  for (const q of bankPool) {
    const words2 = normalizeQuestionKey(q.question)
      .split(" ")
      .filter((w) => w.length > 2 && !SIMILARITY_STOPWORDS.has(w));
    if (words2.length === 0) continue;
    const set2 = new Set(words2);
    let overlap = 0;
    for (const w of set1) {
      if (set2.has(w)) overlap++;
    }
    const score = overlap / Math.min(set1.size, set2.size);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = q;
    }
  }
  return bestScore >= 0.4 ? bestMatch : null;
}

function extractSegmentTranscriptFallback(
  segmentMeta: ActiveSegmentMeta,
  liveDraftTranscriptValue: string,
  liveTranscriptTextValue: string | null
): string {
  const draftText = (liveDraftTranscriptValue || "").trim();
  const liveText = (liveTranscriptTextValue || "").trim();

  const draftDelta = draftText.slice(Math.max(0, segmentMeta.baselineDraftChars)).trim();
  const liveDelta = liveText.slice(Math.max(0, segmentMeta.baselineLiveChars)).trim();

  return draftDelta || liveDelta || draftText || liveText || "";
}

// Increase live chunk interval to reduce live transcription request rate (avoid 429)
const LIVE_CHUNK_INTERVAL_MS = 4000;
const LIVE_DRAFT_FALLBACK_TIMEOUT_MS = 1200;
const OPENING_QUESTION_ID = "890b7831-97c4-4f25-bf26-590ca44fbee7";
const RANDOM_BANK_QUESTION_COUNT = 10;
const MIN_SESSION_QUESTION_COUNT = 10;
const MAX_SESSION_QUESTION_COUNT = 20;
const STAR_AVERAGE_TARGET_SCORE = 3.0;
const AUTO_SILENCE_RMS_THRESHOLD = 0.015;
const AUTO_SILENCE_DURATION_MS = 1700;
const AUTO_MIN_SPEECH_MS = 800;
const AUTO_NOISE_FLOOR_ALPHA = 0.05;
const AUTO_SPEECH_MULTIPLIER = 1.8;
const AUTO_MAX_ANSWER_MS = 120000;
const AUTO_NO_SPEECH_TIMEOUT_MS = 5000;
const AUTO_NO_SPEECH_MIN_TRANSCRIPT_DELTA_CHARS = 12;
const FINISH_PROMPT_COOLDOWN_MS = 10000;
const TRANSCRIPT_FAST_POLL_MS = 800;
const TRANSCRIPT_NORMAL_POLL_MS = 2500;
const AUTO_CAPTURE_ARM_DELAY_MS = 3000;
const LIVE_TRANSCRIBE_REQUEST_TIMEOUT_MS = 3500;
const SEGMENT_PERSIST_TIMEOUT_MS = 15000;
const STOP_RECORDING_FALLBACK_TIMEOUT_MS = 12000;

// ---------------------------------------------------------------------------
// Session Details Modal helpers
// ---------------------------------------------------------------------------
function sessionScoreBadgeClass(score: number | null | undefined) {
  if (score == null) return "bg-gray-100 text-gray-500";
  if (score >= 4) return "bg-emerald-100 text-emerald-700";
  if (score >= 3) return "bg-cyan-100 text-cyan-700";
  if (score >= 2) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function SessionVideoPlayer({ src, mime, loading }: { src: string | null; mime?: string; loading?: boolean }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setError(false);
    if (ref.current) ref.current.load();
  }, [src]);

  if (loading && !src) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
        <span className="text-sm text-gray-400">Loading video…</span>
      </div>
    );
  }

  if (!src || error) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center gap-2">
        <Video className="w-8 h-8 text-gray-500" />
        <span className="text-sm text-gray-400">{!src ? "No recording available" : "Video could not be loaded"}</span>
      </div>
    );
  }

  return (
    <video ref={ref} controls className="w-full aspect-video bg-black rounded-xl" onError={() => setError(true)}>
      <source src={src} type={mime || "video/webm"} />
      Your browser does not support the video tag.
    </video>
  );
}

const STAR_LABEL_MAP: Record<string, string> = {
  situation:  'Situation',
  task:       'Task',
  action:     'Action',
  result:     'Result',
  reflection: 'Reflection',
};

const STAR_DIM_ORDER = ['situation', 'task', 'action', 'result', 'reflection'];

function SessionStarBar({ label, value }: { label: string; value: number | undefined }) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  const displayLabel = STAR_LABEL_MAP[label.toLowerCase()] ?? label.charAt(0).toUpperCase() + label.slice(1);
  const color = v >= 4 ? 'bg-emerald-500' : v >= 3 ? 'bg-cyan-500' : v >= 2 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{displayLabel}</span>
        <span className="font-medium text-gray-800">{v.toFixed(0)} / 5</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(v / 5) * 100}%` }} />
      </div>
    </div>
  );
}

function SessionQuestionCard({ qIdx, segments, loadingVideos }: { qIdx: string; segments: StudentSegment[]; loadingVideos?: boolean }) {
  const [open, setOpen] = React.useState(true);
  const first = segments[0];
  const score: number | null = first?.evaluation?.score ?? null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-gray-900 shrink-0">Question #{Number(qIdx) + 1}</span>
          {first?.questionText && (
            <span className="text-sm text-gray-500 truncate hidden sm:block">— {first.questionText}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {score != null && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sessionScoreBadgeClass(score)}`}>
              {score.toFixed(2)} / 5
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-5">
          {first?.questionText && (
            <p className="text-sm font-medium text-gray-800 bg-cyan-50 border border-cyan-100 rounded-lg px-4 py-3">
              {first.questionText}
            </p>
          )}
          {segments.map((seg) => (
            <div key={seg.id} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Recording{segments.length > 1 && seg.segment_order != null ? ` — Segment ${seg.segment_order}` : ""}
                </p>
                <SessionVideoPlayer
                  src={seg.signedUrl}
                  mime={seg.mime_type || seg.metadata?.mime_type || "video/webm"}
                  loading={loadingVideos && !seg.signedUrl}
                />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transcript</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 leading-relaxed min-h-[100px] max-h-48 overflow-y-auto">
                    {seg.transcript_text?.trim() || <span className="text-gray-400 italic">No transcript available.</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Evaluation</p>
                  {seg.evaluation?.score != null ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">Overall Score</span>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${sessionScoreBadgeClass(seg.evaluation.score)}`}>
                          {seg.evaluation.score.toFixed(2)} / 5
                        </span>
                      </div>
                      {seg.evaluation.hrLabel && (
                        <p className="text-xs text-gray-500 italic">{seg.evaluation.hrLabel}</p>
                      )}
                      {seg.evaluation.breakdown && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">STAR Breakdown</p>
                          {STAR_DIM_ORDER.map((k) => (
                            <SessionStarBar key={k} label={k} value={(seg.evaluation.breakdown as any)[k]} />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-400 italic">
                      No evaluation available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MockInterviewPageContent({
  email,
  userName,
  userId,
  studentId,
  onLogout,
  onNavigate,
}: MockInterviewPageContentProps & { studentId?: string }) {
  const messageBox = useMessageBox();
  const userID = studentId || "";
  const SESSION_BACKUP_KEY = "mock_interview_state_active";
  const ACTIVE_KEY_STORAGE = "mock_interview_active_key";
  const derivedStateKey = React.useMemo(
    () => `mock_interview_state_${userId || email || "guest"}`,
    [userId, email]
  );
  const [stateKey, setStateKey] = useState(() => {
    try {
      return sessionStorage.getItem(ACTIVE_KEY_STORAGE) || derivedStateKey;
    } catch {
      return derivedStateKey;
    }
  });
  const initialStateRef = useRef<{
    hasStarted: boolean;
    isSessionStarted: boolean;
    isPaused: boolean;
    isPauseTranscriptPending: boolean;
    isCompleted: boolean;
    currentQuestion: number;
    isCameraOn: boolean;
    isMicOn: boolean;
    sessionId: string | null;
    storagePrefix: string | null;
    savedSegmentCount: number;
    liveDraftTranscript: string;
    liveTranscriptText: string | null;
    latestWhisperStatus: string | null;
    preparedNextAction: PreparedNextAction | null;
    questions: Question[];
    bankQuestionPool: Question[];
    followupCountByBase: Record<string, number>;
  } | null>(null);

  if (!initialStateRef.current) {
    try {
      const preferredKey =
        sessionStorage.getItem(ACTIVE_KEY_STORAGE) || derivedStateKey;
      const savedState =
        localStorage.getItem(preferredKey) ||
        sessionStorage.getItem(SESSION_BACKUP_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState) as PersistedMockInterviewState;
        initialStateRef.current = {
          hasStarted: Boolean(parsed.hasStarted),
          isSessionStarted: Boolean(parsed.isSessionStarted),
          isPaused: typeof parsed.isPaused === "boolean" ? parsed.isPaused : false,
          isPauseTranscriptPending:
            typeof parsed.isPauseTranscriptPending === "boolean"
              ? parsed.isPauseTranscriptPending
              : false,
          isCompleted: Boolean(parsed.isCompleted),
          currentQuestion: typeof parsed.currentQuestion === "number" ? parsed.currentQuestion : 0,
          isCameraOn: Boolean(parsed.isCameraOn),
          isMicOn: typeof parsed.isMicOn === "boolean" ? parsed.isMicOn : true,
          sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : null,
          storagePrefix: typeof parsed.storagePrefix === "string" ? parsed.storagePrefix : null,
          savedSegmentCount: typeof parsed.savedSegmentCount === "number" ? parsed.savedSegmentCount : 0,
          liveDraftTranscript:
            typeof parsed.liveDraftTranscript === "string" ? parsed.liveDraftTranscript : "",
          liveTranscriptText:
            typeof parsed.liveTranscriptText === "string" ? parsed.liveTranscriptText : null,
          latestWhisperStatus:
            typeof parsed.latestWhisperStatus === "string" ? parsed.latestWhisperStatus : null,
          preparedNextAction:
            parsed.preparedNextAction && typeof parsed.preparedNextAction === "object"
              ? parsed.preparedNextAction
              : null,
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
          bankQuestionPool: Array.isArray(parsed.bankQuestionPool) ? parsed.bankQuestionPool : [],
          followupCountByBase:
            parsed.followupCountByBase && typeof parsed.followupCountByBase === "object"
              ? parsed.followupCountByBase
              : {},
        };
      }
    } catch (error) {
      console.error("Failed to restore mock interview state:", error);
    }
  }

  const [hasStarted, setHasStarted] = useState(
    initialStateRef.current?.hasStarted ?? false
  );
  const [isSessionStarted, setIsSessionStarted] = useState(
    initialStateRef.current?.isSessionStarted ?? false
  );
  const [isCompleted, setIsCompleted] = useState(
    initialStateRef.current?.isCompleted ?? false
  );
  const [currentQuestion, setCurrentQuestion] = useState(
    initialStateRef.current?.currentQuestion ?? 0
  );
  const [isCameraOn, setIsCameraOn] = useState(
    initialStateRef.current?.isCameraOn ?? false
  );
  const [isMicOn, setIsMicOn] = useState(
    initialStateRef.current?.isMicOn ?? true
  );
  const [isMicLoopbackOn, setIsMicLoopbackOn] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPreviewTip, setShowPreviewTip] = useState(true);
  const [isPaused, setIsPaused] = useState(
    initialStateRef.current?.isPaused ?? false
  );
  const [isHydrated, setIsHydrated] = useState(Boolean(initialStateRef.current));
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micTestError, setMicTestError] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isUploadingSegment, setIsUploadingSegment] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    initialStateRef.current?.sessionId ?? null
  );
  const [storagePrefix, setStoragePrefix] = useState<string | null>(
    initialStateRef.current?.storagePrefix ?? null
  );
  const [savedSegmentCount, setSavedSegmentCount] = useState(
    initialStateRef.current?.savedSegmentCount ?? 0
  );
  const [liveDraftTranscript, setLiveDraftTranscript] = useState(
    initialStateRef.current?.liveDraftTranscript ?? ""
  );
  const [fullSessionTranscript, setFullSessionTranscript] = useState("");
  const [liveTranscriptText, setLiveTranscriptText] = useState<string | null>(
    initialStateRef.current?.liveTranscriptText ?? null
  );
  const [evaluations, setEvaluations] = useState<Record<number, any>>({});
  const lastEvaluatedTranscriptRef = useRef<Record<number, string>>({});
  const [latestWhisperStatus, setLatestWhisperStatus] = useState<string | null>(
    initialStateRef.current?.latestWhisperStatus ?? null
  );
  const [isPauseTranscriptPending, setIsPauseTranscriptPending] = useState(
    initialStateRef.current?.isPauseTranscriptPending ?? false
  );
  const [liveDraftStatus, setLiveDraftStatus] = useState<string | null>(null);
  const [showFinishSpeakingPrompt, setShowFinishSpeakingPrompt] = useState(false);
  const [useLiveChunkFallback, setUseLiveChunkFallback] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(true);
  const [historySessions, setHistorySessions] = useState<SessionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState<SessionHistoryItem | null>(null);
  const [historySegmentsByQuestion, setHistorySegmentsByQuestion] = useState<Record<string, StudentSegment[]>>({});
  const [loadingHistorySegments, setLoadingHistorySegments] = useState(false);
  const [loadingHistoryVideos, setLoadingHistoryVideos] = useState(false);
  const [exportingHistoryId, setExportingHistoryId] = useState<string | null>(null);
  const prefetchedUrlsRef = useRef<Record<string, Record<string, string>>>({});
  const prefetchedSessionsRef = useRef<Set<string>>(new Set());
  const [questions, setQuestions] = useState<Question[]>(
    initialStateRef.current?.questions ?? []
  );
  const [bankQuestionPool, setBankQuestionPool] = useState<Question[]>(
    initialStateRef.current?.bankQuestionPool ?? []
  );
  const [followupCountByBase, setFollowupCountByBase] = useState<Record<string, number>>(
    initialStateRef.current?.followupCountByBase ?? {}
  );
  const [isDecidingNextQuestion, setIsDecidingNextQuestion] = useState(false);
  const [isAdvancingNextQuestion, setIsAdvancingNextQuestion] = useState(false);
  const [preparedNextAction, setPreparedNextAction] = useState<PreparedNextAction | null>(
    initialStateRef.current?.preparedNextAction ?? null
  );
  const [isNextConfirmed, setIsNextConfirmed] = useState(false);
  const [questionRatings, setQuestionRatings] = useState<Record<string, "good" | "bad">>({});
  const [questionHighlighted, setQuestionHighlighted] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState<number | null>(null);
  const [questionPillExpanded, setQuestionPillExpanded] = useState(false);
  const [showTipToast, setShowTipToast] = useState(false);
  const [showSessionToast, setShowSessionToast] = useState(false);
  const [showInstructionToast, setShowInstructionToast] = useState(false);
  const tipToastDismissed = useRef(false);
  const sessionToastDismissed = useRef(false);
  const instructionToastDismissed = useRef(false);
  const prevQuestionForHighlightRef = useRef<number | null>(null);
  useEffect(() => {
    setIsNextConfirmed(false);
  }, [preparedNextAction, currentQuestion, isSessionStarted]);

  // Mobile toasts: show when question changes or session starts, auto-dismiss
  // Only shows if user hasn't manually closed them
  useEffect(() => {
    if (!isSessionStarted) return;
    setQuestionPillExpanded(false);
    if (!tipToastDismissed.current) setShowTipToast(true);
    if (!sessionToastDismissed.current) setShowSessionToast(true);
    if (!instructionToastDismissed.current) setShowInstructionToast(true);
    const t1 = setTimeout(() => setShowTipToast(false), 6000);
    const t2 = setTimeout(() => setShowSessionToast(false), 8000);
    const t3 = setTimeout(() => setShowInstructionToast(false), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [currentQuestion, isSessionStarted]);

  // Highlight question card when question changes during active session
  useEffect(() => {
    if (!isSessionStarted) {
      prevQuestionForHighlightRef.current = null;
      return;
    }
    if (prevQuestionForHighlightRef.current !== null && prevQuestionForHighlightRef.current !== currentQuestion) {
      setQuestionHighlighted(true);
      const t = window.setTimeout(() => setQuestionHighlighted(false), 2500);
      prevQuestionForHighlightRef.current = currentQuestion;
      return () => window.clearTimeout(t);
    }
    prevQuestionForHighlightRef.current = currentQuestion;
  }, [currentQuestion, isSessionStarted]);

  // 3-2-1 countdown overlay when recording starts on each question
  useEffect(() => {
    if (!isSessionStarted) {
      setRecordingCountdown(null);
      return;
    }
    setRecordingCountdown(3);
    const t1 = window.setTimeout(() => setRecordingCountdown(2), 1000);
    const t2 = window.setTimeout(() => setRecordingCountdown(1), 2000);
    const t3 = window.setTimeout(() => setRecordingCountdown(null), 3000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [currentQuestion, isSessionStarted]);

  // Auto-dismiss preview tip after 6 seconds
  useEffect(() => {
    if (!showPreviewTip) return;
    const t = setTimeout(() => setShowPreviewTip(false), 6000);
    return () => clearTimeout(t);
  }, [showPreviewTip]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const liveTranscriptionRecorderRef = useRef<MediaRecorder | null>(null);
  const liveTranscriptionInFlightRef = useRef(false);
  const liveTranscriptionCooldownUntilRef = useRef(0);
  const liveTranscriptionBackoffMsRef = useRef(0);
  const activeSegmentMetaRef = useRef<ActiveSegmentMeta | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const speechFinalTextRef = useRef("");
  const liveDraftTranscriptRef = useRef("");
  const liveTranscriptTextRef = useRef<string | null>(null);
  const liveDraftHasResultRef = useRef(false);
  const liveDraftFallbackTimerRef = useRef<number | null>(null);
  const fullSessionTranscriptRef = useRef("");
  const pendingStopResolveRef = useRef<(() => void) | null>(null);
  const segmentOrderRef = useRef(1);
  const micTestStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const desiredCameraOnRef = useRef(false);
  const cameraRequestIdRef = useRef(0);
  const hasHydratedRef = useRef(Boolean(initialStateRef.current));
  const lastHydratedKeyRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const activeQuestionIndexRef = useRef(0);
  const previousSessionStartedRef = useRef<boolean | null>(null);
  const previousQuestionRef = useRef<number | null>(null);
  const bankQuestionPoolRef = useRef<Question[]>([]);
  const silenceDetectionAudioContextRef = useRef<AudioContext | null>(null);
  const silenceDetectionAnalyserRef = useRef<AnalyserNode | null>(null);
  const silenceDetectionSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceDetectionAnimationRef = useRef<number | null>(null);
  const silenceSpeechStartedAtRef = useRef(0);
  const silenceLastSpeechAtRef = useRef(0);
  const silenceNoiseFloorRef = useRef(0.008);
  const finishPromptShownByQuestionRef = useRef<Record<number, boolean>>({});
  const finishPromptCooldownUntilRef = useRef(0);
  const autoPauseInFlightRef = useRef(false);
  const nextQuestionInFlightRef = useRef(false);
  const tabBackgroundPauseInFlightRef = useRef(false);
  const transcriptRefreshInFlightRef = useRef(false);
  const isApplyingPopstateRef = useRef(false);
  const hasInitializedHistoryStateRef = useRef(false);

  useEffect(() => {
    liveDraftTranscriptRef.current = liveDraftTranscript;
  }, [liveDraftTranscript]);

  useEffect(() => {
    liveTranscriptTextRef.current = liveTranscriptText;
  }, [liveTranscriptText]);

  const currentViewStep = React.useMemo(() => {
    if (showHistoryView) return "history";
    if (!hasStarted) return "ready";
    if (isCompleted) return "completed";
    return "session";
  }, [hasStarted, isCompleted, showHistoryView]);

  const fetchSessionHistory = useCallback(async () => {
    if (!userId) {
      setHistorySessions([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("id, status, total_questions, current_question_index, started_at, ended_at, created_at, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Failed to load interview history:", error);
        setHistorySessions([]);
        return;
      }

      const mapped: SessionHistoryItem[] = (data || []).map((session: any) => {
        const metadata = session?.metadata && typeof session.metadata === "object" ? session.metadata : {};
        const scoreSummary =
          metadata?.score_summary && typeof metadata.score_summary === "object"
            ? metadata.score_summary
            : null;

        const scoreCandidates = [
          Number(scoreSummary?.overall_average),
          Number(metadata?.overall_average),
          Number(metadata?.session_score),
        ];
        const score = scoreCandidates.find((value) => Number.isFinite(value));

        const evaluatedCountCandidate = Number(scoreSummary?.evaluated_count);
        const evaluatedCount = Number.isFinite(evaluatedCountCandidate) ? evaluatedCountCandidate : null;

        const metadataQuestionCountCandidate = Number(metadata?.questions_attempted);
        const metadataQuestionCount = Number.isFinite(metadataQuestionCountCandidate)
          ? Math.max(0, Math.floor(metadataQuestionCountCandidate))
          : null;
        const progressQuestionCount = Number.isFinite(Number(session.current_question_index))
          ? Number(session.current_question_index) + 1
          : null;
        const configuredQuestionCount = Number(session.total_questions || 0);
        const derivedQuestionCount =
          metadataQuestionCount ??
          progressQuestionCount ??
          (Number.isFinite(configuredQuestionCount) ? configuredQuestionCount : 0);

        return {
          id: session.id,
          status: session.status || "unknown",
          totalQuestions: Math.max(0, derivedQuestionCount),
          startedAt: session.started_at || null,
          endedAt: session.ended_at || null,
          createdAt: session.created_at,
          score: typeof score === "number" ? score : null,
          evaluatedCount,
        };
      });

      // Mark any lingering in_progress sessions as ended
      // (these are abandoned sessions where the user closed/navigated away without ending)
      const inProgressIds = mapped
        .filter((s) => s.status === "in_progress")
        .map((s) => s.id);

      if (inProgressIds.length > 0) {
        await supabase
          .from("interview_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .in("id", inProgressIds);
        mapped.forEach((s) => {
          if (s.status === "in_progress") s.status = "ended";
        });
      }

      setHistorySessions(mapped);
    } catch (error) {
      console.error("Unexpected error loading interview history:", error);
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!hasStarted && !isCompleted && showHistoryView) {
      void fetchSessionHistory();
    }
  }, [fetchSessionHistory, hasStarted, isCompleted, showHistoryView]);

  // Prefetch signed video URLs for recent sessions in the background so
  // videos are ready immediately when the user opens a session modal.
  useEffect(() => {
    if (!historySessions.length) return;
    const PREFETCH_LIMIT = 5;
    const toPrefetch = historySessions.slice(0, PREFETCH_LIMIT);

    void (async () => {
      for (const session of toPrefetch) {
        if (prefetchedSessionsRef.current.has(session.id)) continue;
        prefetchedSessionsRef.current.add(session.id);
        try {
          const { data: segs } = await supabase
            .from("interview_recording_segments")
            .select("id, question_index, segment_order, storage_path, metadata")
            .eq("session_id", session.id)
            .order("question_index", { ascending: true })
            .order("segment_order", { ascending: true });

          if (!segs?.length) continue;

          // Keep only final segment per question (mirrors display logic)
          const finalByQ: Record<string, any> = {};
          for (const seg of segs) {
            finalByQ[String(seg.question_index ?? 0)] = seg;
          }

          const urlMap: Record<string, string> = {};
          for (const seg of Object.values(finalByQ)) {
            if (!seg.storage_path) continue;
            const bucket = seg.metadata?.storage_bucket || seg.metadata?.bucket || "interview-recordings";
            const rawPath = String(seg.storage_path).trim();
            const paths = Array.from(new Set([rawPath, rawPath.replace(/^\/+/, ""), rawPath.replace(/^interview-recordings\//, "")]));
            for (const path of paths) {
              try {
                // eslint-disable-next-line no-await-in-loop
                const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
                if (data?.signedUrl) { urlMap[seg.id] = data.signedUrl; break; }
              } catch {}
            }
          }
          prefetchedUrlsRef.current = { ...prefetchedUrlsRef.current, [session.id]: urlMap };
        } catch {}
      }
    })();
  }, [historySessions]);

  async function handleViewHistorySession(session: SessionHistoryItem) {
    setSelectedHistorySession(session);
    setLoadingHistorySegments(true);
    setLoadingHistoryVideos(true);
    setHistorySegmentsByQuestion({});
    try {
      const { data: segs, error } = await supabase
        .from("interview_recording_segments")
        .select("id, question_id, question_index, segment_order, storage_path, mime_type, transcript_text, whisper_status, metadata, created_at")
        .eq("session_id", session.id)
        .order("question_index", { ascending: true })
        .order("segment_order", { ascending: true });

      if (error) { console.error("fetchSegments:", error); setHistorySegmentsByQuestion({}); setLoadingHistorySegments(false); setLoadingHistoryVideos(false); return; }

      const segments = segs || [];

      const qIds = Array.from(new Set(segments.map((s: any) => s.question_id).filter(Boolean)));
      const questionMap: Record<string, string> = {};
      if (qIds.length > 0) {
        try {
          const { data: qdata } = await supabase.from("interview_question_bank").select("id, question_text").in("id", qIds);
          if (qdata) for (const q of qdata) questionMap[String(q.id)] = q.question_text;
        } catch (e) { console.warn("fetchQuestions:", e); }
      }

      const getSegEvalCache = (segId: string) => { try { const r = localStorage.getItem(`seg_eval_${segId}`); return r ? JSON.parse(r) : null; } catch { return null; } };
      const setSegEvalCache = (segId: string, ev: any) => { try { localStorage.setItem(`seg_eval_${segId}`, JSON.stringify(ev)); } catch {} };

      // Phase 1: group all segments, then keep only the final (highest segment_order) per question
      // Segments are ordered ASC by segment_order, so last in array = final answer
      const grouped: Record<string, StudentSegment[]> = {};
      for (const seg of segments) {
        const questionText = seg.metadata?.question_text || questionMap[String(seg.question_id)] || `Question #${(seg.question_index ?? 0) + 1}`;
        const qk = String(seg.question_index ?? 0);
        if (!grouped[qk]) grouped[qk] = [];
        grouped[qk].push({ ...seg, signedUrl: null, questionText, evaluation: getSegEvalCache(seg.id) });
      }
      for (const qk of Object.keys(grouped)) {
        grouped[qk] = [grouped[qk][grouped[qk].length - 1]];
      }

      setHistorySegmentsByQuestion({ ...grouped });
      setLoadingHistorySegments(false);

      // Phase 1b: evaluate only the kept (final) segments not yet cached, then cache results
      const keptSegments = Object.values(grouped).map((segs) => segs[0]).filter(Boolean);
      for (const seg of keptSegments) {
        if (!seg.transcript_text?.trim()) continue;
        if (getSegEvalCache(seg.id)) continue;
        const questionText = seg.metadata?.question_text || questionMap[String(seg.question_id)] || `Question #${(seg.question_index ?? 0) + 1}`;
        try {
          // eslint-disable-next-line no-await-in-loop
          const evaluation = await evaluateAnswer(questionText, seg.transcript_text);
          setSegEvalCache(seg.id, evaluation);
          const qk = String(seg.question_index ?? 0);
          grouped[qk] = grouped[qk].map((s) => (s.id === seg.id ? { ...s, evaluation } : s));
          setHistorySegmentsByQuestion({ ...grouped });
        } catch (e) { console.warn("evaluation:", e); }
      }

      // Phase 2: fetch video URLs in background
      const trySignedUrl = async (bucket: string, path: string): Promise<string | null> => {
        try {
          const { data, error: urlError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
          if (urlError) { console.warn(`[video] bucket="${bucket}" path="${path}" → ${urlError.message}`); return null; }
          return data?.signedUrl ?? (data as any)?.signedURL ?? null;
        } catch (e) { console.warn("[video] createSignedUrl threw:", e); return null; }
      };

      const tryPublicUrl = (bucket: string, path: string): string | null => {
        try {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          return data?.publicUrl ?? null;
        } catch { return null; }
      };

      // Phase 2 only processes the kept (final) segment per question
      for (const [qk, qSegs] of Object.entries(grouped)) {
        const seg = qSegs[0];
        if (!seg || !seg.storage_path) continue;

        // Check prefetch cache first — avoids a live Supabase Storage call
        const cachedUrl = prefetchedUrlsRef.current[session.id]?.[seg.id];
        if (cachedUrl) {
          grouped[qk] = [{ ...seg, signedUrl: cachedUrl }];
          setHistorySegmentsByQuestion({ ...grouped });
          continue;
        }

        const bucketFromMeta = typeof seg.metadata?.storage_bucket === "string" ? seg.metadata.storage_bucket : typeof seg.metadata?.bucket === "string" ? seg.metadata.bucket : null;
        const bucketCandidates = Array.from(new Set([bucketFromMeta, "interview-recordings"].filter(Boolean) as string[]));
        const rawPath = String(seg.storage_path).trim();
        const normalizedPaths = Array.from(new Set([rawPath, rawPath.replace(/^\/+/, ""), rawPath.replace(/^interview-recordings\//, ""), rawPath.replace(/^\/interview-recordings\//, "")].filter(Boolean)));

        let signedUrl: string | null = null;
        for (const bucket of bucketCandidates) {
          for (const path of normalizedPaths) {
            // eslint-disable-next-line no-await-in-loop
            signedUrl = await trySignedUrl(bucket, path);
            if (signedUrl) break;
          }
          if (signedUrl) break;
        }
        if (!signedUrl) {
          for (const bucket of bucketCandidates) {
            for (const path of normalizedPaths) {
              signedUrl = tryPublicUrl(bucket, path);
              if (signedUrl) break;
            }
            if (signedUrl) break;
          }
        }

        grouped[qk] = [{ ...seg, signedUrl }];
        setHistorySegmentsByQuestion({ ...grouped });
      }
    } catch (err) {
      console.error(err); setHistorySegmentsByQuestion({});
    } finally {
      setLoadingHistorySegments(false);
      setLoadingHistoryVideos(false);
    }
  }

  async function handleExportHistorySession(session: SessionHistoryItem) {
    setExportingHistoryId(session.id);
    try {
      if (!(window as any).XLSX) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load SheetJS"));
          document.head.appendChild(s);
        });
      }
      const XLSX = (window as any).XLSX;

      const { data: segs, error } = await supabase
        .from("interview_recording_segments")
        .select("id, question_id, question_index, segment_order, transcript_text, whisper_status, metadata, created_at")
        .eq("session_id", session.id)
        .order("question_index", { ascending: true })
        .order("segment_order", { ascending: true });

      if (error || !segs || segs.length === 0) {
        await messageBox.alert({ title: "No Recordings Found", message: "No recorded segments were found for this session.", tone: "warning" });
        return;
      }

      const qIds = Array.from(new Set(segs.map((s: any) => s.question_id).filter(Boolean)));
      const questionMap: Record<string, string> = {};
      if (qIds.length > 0) {
        const { data: qdata } = await supabase.from("interview_question_bank").select("id, question_text").in("id", qIds);
        if (qdata) for (const q of qdata) questionMap[String(q.id)] = q.question_text;
      }

      const byQ: Record<number, { questionText: string; transcripts: string[]; createdAt: string }> = {};
      for (const seg of segs) {
        const qi: number = seg.question_index ?? 0;
        const qText = seg.metadata?.question_text || questionMap[String(seg.question_id)] || `Question #${qi + 1}`;
        if (!byQ[qi]) byQ[qi] = { questionText: qText, transcripts: [], createdAt: seg.created_at };
        if (seg.transcript_text?.trim()) byQ[qi].transcripts.push(seg.transcript_text.trim());
      }

      const questionRows: any[] = [];
      const allScores: number[] = [];
      const sortedIndices = Object.keys(byQ).map(Number).sort((a, b) => a - b);

      for (const qi of sortedIndices) {
        const { questionText, transcripts, createdAt } = byQ[qi];
        const fullTranscript = transcripts.join(" ").trim();
        let evaluation: any = null;
        try {
          if (fullTranscript) {
            // eslint-disable-next-line no-await-in-loop
            evaluation = await evaluateAnswer(questionText, fullTranscript);
          }
        } catch {}
        const score = evaluation?.score ?? null;
        if (score != null) allScores.push(score);
        questionRows.push({
          "Q#": qi + 1,
          "Question": questionText,
          "Answer Transcript": fullTranscript || "—",
          "Score (1–5)": score != null ? score.toFixed(2) : "—",
          "HR Label": evaluation?.hrLabel ?? "—",
          "Situation": evaluation?.breakdown?.situation ?? "—",
          "Task": evaluation?.breakdown?.task ?? "—",
          "Action": evaluation?.breakdown?.action ?? "—",
          "Result": evaluation?.breakdown?.result ?? "—",
          "Reflection": evaluation?.breakdown?.reflection ?? "—",
          "Evaluated At": createdAt ? new Date(createdAt).toLocaleString() : "—",
        });
      }

      const overallScore = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : "—";

      const summaryRows = [
        { Field: "Session ID", Value: session.id },
        { Field: "Status", Value: session.status },
        { Field: "Started At", Value: session.startedAt ? new Date(session.startedAt).toLocaleString() : "—" },
        { Field: "Ended At", Value: session.endedAt ? new Date(session.endedAt).toLocaleString() : "—" },
        { Field: "Total Questions", Value: String(session.totalQuestions ?? questionRows.length) },
        { Field: "Overall Avg Score (1–5)", Value: overallScore },
      ];

      const wbSummary = XLSX.utils.json_to_sheet(summaryRows, { skipHeader: false });
      wbSummary["!cols"] = [{ wch: 28 }, { wch: 60 }];

      const wbDetail = XLSX.utils.json_to_sheet(questionRows);
      wbDetail["!cols"] = [{ wch: 4 }, { wch: 45 }, { wch: 60 }, { wch: 12 }, { wch: 30 }, { wch: 11 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 22 }];

      const range = XLSX.utils.decode_range(wbDetail["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!wbDetail[cellAddress]) continue;
          wbDetail[cellAddress].s = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: R === 0 ? { bold: true } : {} };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wbSummary, "Summary");
      XLSX.utils.book_append_sheet(wb, wbDetail, "Question Details");

      const dateSlug = session.startedAt ? new Date(session.startedAt).toISOString().slice(0, 10) : "unknown";
      XLSX.writeFile(wb, `my_interview_${dateSlug}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
      await messageBox.alert({ title: "Export Failed", message: "Export failed. Please try again.", tone: "error" });
    } finally {
      setExportingHistoryId(null);
    }
  }

  useEffect(() => {
    if (stateKey === derivedStateKey) return;
    if (stateKey.endsWith("_guest") && derivedStateKey !== stateKey) {
      try {
        const previousState = localStorage.getItem(stateKey);
        if (previousState) {
          localStorage.setItem(derivedStateKey, previousState);
          localStorage.removeItem(stateKey);
        }
      } catch (error) {
        console.error("Failed to migrate mock interview state:", error);
      }
    }
    try {
      sessionStorage.setItem(ACTIVE_KEY_STORAGE, derivedStateKey);
    } catch {
      // ignore storage errors
    }
    setStateKey(derivedStateKey);
  }, [derivedStateKey, stateKey]);

  useEffect(() => {
    if (!stateKey) return;
    if (lastHydratedKeyRef.current === stateKey) return;
    try {
      let savedState = localStorage.getItem(stateKey);
      if (!savedState) {
        savedState = sessionStorage.getItem(SESSION_BACKUP_KEY);
      }
      if (!savedState) {
        hasHydratedRef.current = true;
        lastHydratedKeyRef.current = stateKey;
        setIsHydrated(true);
        return;
      }
      const parsed = JSON.parse(savedState) as PersistedMockInterviewState;
      if (typeof parsed.hasStarted === "boolean") {
        setHasStarted(parsed.hasStarted);
      }
      if (typeof parsed.isSessionStarted === "boolean") {
        setIsSessionStarted(parsed.isSessionStarted);
      }
      if (typeof parsed.isPaused === "boolean") {
        setIsPaused(parsed.isPaused);
      }
      if (typeof parsed.isPauseTranscriptPending === "boolean") {
        setIsPauseTranscriptPending(parsed.isPauseTranscriptPending);
      }
      if (typeof parsed.isCompleted === "boolean") {
        setIsCompleted(parsed.isCompleted);
      }
      if (typeof parsed.currentQuestion === "number") {
        setCurrentQuestion(parsed.currentQuestion);
      }
      if (typeof parsed.isCameraOn === "boolean") {
        setIsCameraOn(parsed.isCameraOn);
      }
      if (typeof parsed.isMicOn === "boolean") {
        setIsMicOn(parsed.isMicOn);
      }
      setSessionId(typeof parsed.sessionId === "string" ? parsed.sessionId : null);
      setStoragePrefix(typeof parsed.storagePrefix === "string" ? parsed.storagePrefix : null);
      if (typeof parsed.savedSegmentCount === "number") {
        setSavedSegmentCount(parsed.savedSegmentCount);
      }
      setLiveDraftTranscript(
        typeof parsed.liveDraftTranscript === "string" ? parsed.liveDraftTranscript : ""
      );
      setLiveTranscriptText(
        typeof parsed.liveTranscriptText === "string" ? parsed.liveTranscriptText : null
      );
      setLatestWhisperStatus(
        typeof parsed.latestWhisperStatus === "string" ? parsed.latestWhisperStatus : null
      );
      if (parsed.preparedNextAction && typeof parsed.preparedNextAction === "object") {
        setPreparedNextAction(parsed.preparedNextAction as PreparedNextAction);
      } else {
        setPreparedNextAction(null);
      }
      if (Array.isArray(parsed.questions)) {
        setQuestions(parsed.questions);
      }
      if (Array.isArray(parsed.bankQuestionPool)) {
        setBankQuestionPool(parsed.bankQuestionPool);
      }
      if (parsed.followupCountByBase && typeof parsed.followupCountByBase === "object") {
        setFollowupCountByBase(parsed.followupCountByBase);
      }
      hasHydratedRef.current = true;
      lastHydratedKeyRef.current = stateKey;
      setIsHydrated(true);
    } catch (error) {
      console.error("Failed to restore mock interview state:", error);
      hasHydratedRef.current = true;
      lastHydratedKeyRef.current = stateKey;
      setIsHydrated(true);
    }
  }, [stateKey]);

  useEffect(() => {
    desiredCameraOnRef.current = isCameraOn;
  }, [isCameraOn]);

  useEffect(() => {
    bankQuestionPoolRef.current = bankQuestionPool;
  }, [bankQuestionPool]);

  useEffect(() => {
    segmentOrderRef.current = Math.max(savedSegmentCount + 1, 1);
  }, [savedSegmentCount]);

  useEffect(() => {
    if (!hasHydratedRef.current || !stateKey) return;
    try {
      const nextState = {
        hasStarted,
        isSessionStarted,
        isPaused,
        isPauseTranscriptPending,
        isCompleted,
        currentQuestion,
        isCameraOn,
        isMicOn,
        sessionId,
        storagePrefix,
        savedSegmentCount,
        liveDraftTranscript,
        liveTranscriptText,
        latestWhisperStatus,
        preparedNextAction,
        questions,
        bankQuestionPool,
        followupCountByBase,
      };
      const serialized = JSON.stringify(nextState);
      localStorage.setItem(stateKey, serialized);
      sessionStorage.setItem(SESSION_BACKUP_KEY, serialized);
      sessionStorage.setItem(ACTIVE_KEY_STORAGE, stateKey);
    } catch (error) {
      console.error("Failed to persist mock interview state:", error);
    }
  }, [hasStarted, isSessionStarted, isPaused, isPauseTranscriptPending, isCompleted, currentQuestion, isCameraOn, isMicOn, sessionId, storagePrefix, savedSegmentCount, liveDraftTranscript, liveTranscriptText, latestWhisperStatus, preparedNextAction, questions, bankQuestionPool, followupCountByBase, stateKey]);

  const persistSnapshot = useCallback(() => {
    if (!stateKey) return;
    try {
      const nextState = {
        hasStarted,
        isSessionStarted,
        isPaused,
        isPauseTranscriptPending,
        isCompleted,
        currentQuestion,
        isCameraOn,
        isMicOn,
        sessionId,
        storagePrefix,
        savedSegmentCount,
        liveDraftTranscript,
        liveTranscriptText,
        latestWhisperStatus,
        preparedNextAction,
        questions,
        bankQuestionPool,
        followupCountByBase,
      };
      const serialized = JSON.stringify(nextState);
      localStorage.setItem(stateKey, serialized);
      sessionStorage.setItem(SESSION_BACKUP_KEY, serialized);
      sessionStorage.setItem(ACTIVE_KEY_STORAGE, stateKey);
    } catch (error) {
      console.error("Failed to persist mock interview state:", error);
    }
  }, [stateKey, hasStarted, isSessionStarted, isPaused, isPauseTranscriptPending, isCompleted, currentQuestion, isCameraOn, isMicOn, sessionId, storagePrefix, savedSegmentCount, liveDraftTranscript, liveTranscriptText, latestWhisperStatus, preparedNextAction, questions, bankQuestionPool, followupCountByBase]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        persistSnapshot();
      }
    };

    const handlePageHide = () => {
      persistSnapshot();
      // Mark active session as ended when the page is closed/navigated away
      const activeId = activeSessionIdRef.current;
      if (activeId && supabaseUrl && supabaseAnonKey) {
        try {
          const storageKey = `sb-${new URL(supabaseUrl).hostname}-auth-token`;
          const stored = localStorage.getItem(storageKey);
          const authToken = stored ? (JSON.parse(stored)?.access_token ?? supabaseAnonKey) : supabaseAnonKey;
          fetch(`${supabaseUrl}/rest/v1/interview_sessions?id=eq.${activeId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${authToken}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ status: "ended", ended_at: new Date().toISOString() }),
            keepalive: true,
          });
        } catch {
          // silently ignore — best-effort only
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [persistSnapshot]);

  useEffect(() => {
    activeSessionIdRef.current = sessionId;
    activeQuestionIndexRef.current = currentQuestion;
  }, [currentQuestion, sessionId]);

  const fetchQuestions = useCallback(async (): Promise<Question[]> => {
    setQuestionsLoading(true);
    setQuestionsError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openingResult = await getPreferredOpeningQuestion(OPENING_QUESTION_ID as any);

    const openingQuestion: Question | null = openingResult.data
      ? {
          ...openingResult.data,
          source: "fixed",
          baseQuestionId: openingResult.data.id,
        }
      : null;

    const excludedIds = [openingQuestion?.id || OPENING_QUESTION_ID].filter(Boolean);
    const bankResult = await getMockInterviewQuestionsExcludingTyped({
      limit: RANDOM_BANK_QUESTION_COUNT,
      excludeIds: excludedIds,
    });

    if (bankResult.error) {
      setQuestions([]);
      setBankQuestionPool([]);
      bankQuestionPoolRef.current = [];
      setQuestionsError("Failed to load question bank. Please try again.");
      setQuestionsLoading(false);
      return [];
    }

    const openingKey = normalizeQuestionKey(openingQuestion?.question || "");
    const seenQuestionKeys = new Set<string>(openingKey ? [openingKey] : []);

    const bankPool = (bankResult.data || [])
      .filter((question: Question) => {
        const key = normalizeQuestionKey(question.question);
        if (!key || seenQuestionKeys.has(key)) {
          return false;
        }
        seenQuestionKeys.add(key);
        return true;
      })
      .map((question: Question) => ({
      ...question,
      source: "bank" as const,
      baseQuestionId: question.id,
    }));

    if (!openingQuestion && bankPool.length === 0) {
      setQuestions([]);
      setBankQuestionPool([]);
      bankQuestionPoolRef.current = [];
      setQuestionsError("No active questions found in the question bank.");
      setQuestionsLoading(false);
      return [];
    }

    const initialQuestions = openingQuestion
      ? [openingQuestion]
      : [bankPool.shift() as Question];
    setQuestions(initialQuestions);
    setBankQuestionPool(bankPool);
    bankQuestionPoolRef.current = bankPool;
    setFollowupCountByBase({});
    setQuestionsLoading(false);
    return initialQuestions;
  }, []);

  const handleRateQuestion = useCallback(async (questionId: string, quality: "good" | "bad") => {
    if (!questionId || questionId.startsWith("ai-")) return; // temp IDs not in bank yet
    setQuestionRatings((prev) => ({ ...prev, [questionId]: quality }));
    await (rateQuestion as (id: string, q: string) => Promise<any>)(questionId, quality);
  }, []);

  const syncSessionResumeState = useCallback(
    async (nextQuestionIndex?: number) => {
      if (!sessionId) {
        return;
      }

      const updates: Promise<any>[] = [
        updateInterviewSessionStatus(sessionId, "in_progress", {
          resumed_at: new Date().toISOString(),
        }),
      ];

      if (typeof nextQuestionIndex === "number") {
        updates.push(updateInterviewSessionProgress(sessionId, nextQuestionIndex));
      }

      await Promise.all(updates);
    },
    [sessionId]
  );

  const fetchAdditionalBankQuestions = useCallback(async (limit: number): Promise<Question[]> => {
    const requestedLimit = Math.max(1, Math.floor(limit || 1));
    const usedQuestionIds = Array.from(
      new Set(
        questions
          .filter((question) => question.source !== "followup")
          .map((question) => question.id)
          .filter(Boolean)
      )
    );

    const bankResult = await getMockInterviewQuestionsExcludingTyped({
      limit: requestedLimit,
      excludeIds: usedQuestionIds,
    });

    if (bankResult.error) {
      setQuestionsError("Failed to load additional question bank items. Please try again.");
      return [];
    }

    const seenQuestionKeys = new Set(
      questions.map((question) => normalizeQuestionKey(question.question)).filter(Boolean)
    );

    return (bankResult.data || [])
      .filter((question: Question) => {
        const key = normalizeQuestionKey(question.question);
        if (!key || seenQuestionKeys.has(key)) {
          return false;
        }
        seenQuestionKeys.add(key);
        return true;
      })
      .map((question: Question) => ({
        ...question,
        source: "bank" as const,
        baseQuestionId: question.id,
      }));
  }, [questions]);

  const calculateSessionStarAverage = useCallback(() => {
    // Compute per-evaluation STAR average from breakdown when available,
    // fall back to `evaluations[index].score` if breakdown missing.
    const evalEntries = Object.entries(evaluations || {}).map(([k, v]) => ({ idx: Number(k), val: v }));
    if (!evalEntries.length) return 0;

    const total = evalEntries.reduce((sum, entry) => {
    // Always use result.score — it is the final capped/blended Likert value.
    // The breakdown is the raw ZSL output and its average intentionally differs
    // from score (that's what allows differentiated per-dimension display).
    const score = Number(entry.val?.score);
    return sum + (Number.isFinite(score) ? score : 0);
  }, 0);

    return total / evalEntries.length;
  }, [evaluations]);

  const computeSessionSTARStats = useCallback(() => {
    // Returns per-dimension averages and overall average across evaluated answers
    const evalEntries = Object.values(evaluations || {}).filter(Boolean);
    const count = evalEntries.length;
    if (count === 0) {
      return {
        overallAverage: 0,
        situation: 0,
        task: 0,
        action: 0,
        result: 0,
        reflection: 0,
        evaluatedCount: 0,
      };
    }

    const sums = evalEntries.reduce(
      (acc, ev) => {
        const bd = ev.breakdown || {};
        acc.situation += Number(bd.situation) || 0;
        acc.task += Number(bd.task) || 0;
        acc.action += Number(bd.action) || 0;
        acc.result += Number(bd.result) || 0;
        acc.reflection += Number(bd.reflection) || 0;
        return acc;
      },
      { situation: 0, task: 0, action: 0, result: 0, reflection: 0 }
    );

    const situation = sums.situation / count;
    const task = sums.task / count;
    const action = sums.action / count;
    const result = sums.result / count;
    const reflection = sums.reflection / count;

    const overallAverage = (situation + task + action + result + reflection) / 5;
    return { overallAverage, situation, task, action, result, reflection, evaluatedCount: count };
  }, [evaluations]);

  const refreshLiveTranscript = useCallback(async () => {
    const targetSessionId = sessionId;
    const targetQuestionIndex = currentQuestion;

    if (!targetSessionId) {
      setLiveTranscriptText(null);
      setLatestWhisperStatus(null);
      return { hasTranscript: false, whisperStatus: null as string | null };
    }

    const { data, error } = await getLatestQuestionTranscript({
      sessionId: targetSessionId,
      questionIndex: targetQuestionIndex,
    });

    if (
      activeSessionIdRef.current !== targetSessionId ||
      activeQuestionIndexRef.current !== targetQuestionIndex
    ) {
      return { hasTranscript: false, whisperStatus: null as string | null };
    }

    if (error || !data) {
      // Keep the last known transcript visible when polling fails transiently
      // (common during tab switches / network hiccups).
      return { hasTranscript: false, whisperStatus: null as string | null };
    }

    const whisperStatus = data.whisper_status || null;
    const transcriptText = data.transcript_text?.trim() || null;

    if (whisperStatus) {
      setLatestWhisperStatus(whisperStatus);
    }
    if (transcriptText) {
      setLiveTranscriptText(transcriptText);
    } else if (whisperStatus === "completed" || whisperStatus === "failed") {
      setLiveTranscriptText(null);
    }

    // If transcript is complete and we have text, run automatic evaluation once
   try {
      const qIndex = targetQuestionIndex;
      const hasText = Boolean(transcriptText);
      const alreadyEvaluated = evaluations[qIndex];

      if (whisperStatus === "completed" && hasText) {
        const alreadyRecorded = lastEvaluatedTranscriptRef.current[qIndex];
        if (!alreadyEvaluated && alreadyRecorded !== transcriptText) {
          // Mark immediately — prevents any subsequent poll from re-entering
          // before the async evaluateAnswer resolves (fixes repeated lookupDataset calls)
          lastEvaluatedTranscriptRef.current = {
            ...lastEvaluatedTranscriptRef.current,
            [qIndex]: transcriptText,
          };

          const questionText = questions[qIndex]?.question || "";
          const isFollowUp = questions[qIndex]?.source === 'followup';
          const result = await evaluateAnswer(questionText, transcriptText, isFollowUp);

          // ── Evaluation result console log ────────────────────────────
          console.log(
            `%c[Evaluation] Q${qIndex + 1}: "${questionText.slice(0, 50)}..."`,
            'color: #6366f1; font-weight: bold'
          );
          console.log(
            `%c  Source:     ${
              result.source === 'roberta_similarity' ? '✅ RoBERTa Semantic Similarity' :
              result.source === 'zsl_roberta'        ? '🟡 ZSL RoBERTa Classification' :
                                                        '⚠️  Regex STAR Fallback'
            }`,
            result.source === 'roberta_similarity' ? 'color: #22c55e' :
            result.source === 'zsl_roberta'        ? 'color: #eab308' : 'color: #f59e0b'
          );
          console.log(
            `%c  Score:      ${result.score} / 5  (${result.hrLabel})`,
            'color: #e2e8f0'
          );
          if (result.source === 'roberta_similarity') {
            console.log(
              `%c  RoBERTa Similarity: ${(result.roberta_similarity * 100).toFixed(1)}%`,
              'color: #e2e8f0'
            );
          }
          console.log(
            `%c  Anchor Score: ${result.datasetAnchorScore ?? 'N/A'}  |  Dataset Similarity: ${(result.datasetSimilarity * 100).toFixed(1)}%`,
            'color: #94a3b8'
          );
          console.log(`%c  STAR Breakdown:`, 'color: #94a3b8', result.breakdown);
          if (result.error) {
            console.warn(`  [Fallback reason] ${result.error}`);
          }
          // ─────────────────────────────────────────────────────────────

          setEvaluations((prev) => {
            const next = { ...(prev || {}), [qIndex]: { ...result, evaluatedAt: new Date().toISOString(), transcript: transcriptText } };
            // persist per-stateKey so results survive reloads for this mock interview
            try {
              if (stateKey) {
                localStorage.setItem(`${stateKey}_evaluations`, JSON.stringify(next));
              }
            } catch {}
            return next;
          });
        }
      }
    } catch (err) {
      console.error("[Evaluation] Failed completely:", err);
    }

    return {
      hasTranscript: Boolean(transcriptText),
      whisperStatus,
    };
  }, [currentQuestion, sessionId]);

  // Load persisted evaluations when stateKey changes
  useEffect(() => {
    if (!stateKey) return;
    try {
      const raw = localStorage.getItem(`${stateKey}_evaluations`);
      if (raw) {
        setEvaluations(JSON.parse(raw));
      }
    } catch {}
  }, [stateKey]);

  const refreshTranscriptAfterPause = useCallback(async () => {
    if (transcriptRefreshInFlightRef.current) return;
    transcriptRefreshInFlightRef.current = true;
    const maxAttempts = 6;
    const draftTranscript = (liveDraftTranscript || "").trim();
    setIsPauseTranscriptPending(true);

    if (draftTranscript) {
      setLiveTranscriptText(draftTranscript);
      setLatestWhisperStatus("in_progress");
    }

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const result = await refreshLiveTranscript();
        if (result.hasTranscript || result.whisperStatus === "completed" || result.whisperStatus === "failed") {
          setIsPauseTranscriptPending(false);
          return;
        }

        if (draftTranscript && attempt >= 2) {
          setIsPauseTranscriptPending(false);
          return;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 450);
          });
        }
      }

      setIsPauseTranscriptPending(false);
    } catch {
      setIsPauseTranscriptPending(false);
    } finally {
      transcriptRefreshInFlightRef.current = false;
    }
  }, [liveDraftTranscript, refreshLiveTranscript]);

  useEffect(() => {
    if (!isPauseTranscriptPending) {
      return;
    }

    if (latestWhisperStatus === "completed" || latestWhisperStatus === "failed") {
      setIsPauseTranscriptPending(false);
    }
  }, [isPauseTranscriptPending, latestWhisperStatus]);

  // Recovery: if the page reloaded while isPauseTranscriptPending was true, the
  // refresh loop is gone. Re-trigger it once on mount so the flag gets cleared
  // and the user can continue the session.
  useEffect(() => {
    if (isHydrated && isPaused && isPauseTranscriptPending) {
      void refreshTranscriptAfterPause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional empty deps — read initial state only, run once on mount

  useEffect(() => {
    const previousSessionStarted = previousSessionStartedRef.current;
    const previousQuestion = previousQuestionRef.current;

    // Skip reset on first mount/hydration so tab return does not lose visible text.
    if (previousSessionStarted === null) {
      previousSessionStartedRef.current = isSessionStarted;
      previousQuestionRef.current = currentQuestion;
      return;
    }

    if (!isSessionStarted) {
      setShowFinishSpeakingPrompt(false);
      previousSessionStartedRef.current = isSessionStarted;
      previousQuestionRef.current = currentQuestion;
      return;
    }

    const sessionJustStarted = !previousSessionStarted && isSessionStarted;
    const questionChanged = previousQuestion !== currentQuestion;

    if (sessionJustStarted || questionChanged) {
      setShowFinishSpeakingPrompt(false);
      setLiveTranscriptText(null);
      setLatestWhisperStatus(null);
      setIsPauseTranscriptPending(false);
      setLiveDraftTranscript("");
      speechFinalTextRef.current = "";
    }

    previousSessionStartedRef.current = isSessionStarted;
    previousQuestionRef.current = currentQuestion;
  }, [currentQuestion, isSessionStarted]);

  useEffect(() => {
    if (!sessionId || !isSessionStarted) {
      setLiveTranscriptText(null);
      setLatestWhisperStatus(null);
      setIsPauseTranscriptPending(false);
      setLiveDraftStatus(null);
      return;
    }

    void refreshLiveTranscript();
    const activePollMs =
      isPauseTranscriptPending || latestWhisperStatus === "in_progress"
        ? TRANSCRIPT_FAST_POLL_MS
        : TRANSCRIPT_NORMAL_POLL_MS;

    const pollId = window.setInterval(() => {
      void refreshLiveTranscript();
    }, activePollMs);

    return () => {
      window.clearInterval(pollId);
    };
  }, [
    isPauseTranscriptPending,
    isSessionStarted,
    latestWhisperStatus,
    refreshLiveTranscript,
    sessionId,
  ]);

  const getSupportedRecordingMimeType = useCallback(() => {
    const preferredTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "video/webm";
  }, []);

  const stopLiveDraftTranscription = useCallback(() => {
    if (liveDraftFallbackTimerRef.current !== null) {
      window.clearTimeout(liveDraftFallbackTimerRef.current);
      liveDraftFallbackTimerRef.current = null;
    }
    liveDraftHasResultRef.current = false;

    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore stop errors
      }
    }
  }, []);

  const appendToFullSessionTranscript = useCallback((text: string) => {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }

    const nextTranscript = fullSessionTranscriptRef.current
      ? `${fullSessionTranscriptRef.current} ${normalized}`
      : normalized;

    fullSessionTranscriptRef.current = nextTranscript;
    setFullSessionTranscript(nextTranscript);
  }, []);

  const appendLiveChunkTranscript = useCallback(
    (text: string) => {
      const normalized = text.replace(/\s+/g, " ").trim();
      if (!normalized) {
        return;
      }

      setLiveDraftTranscript((previous) => `${previous} ${normalized}`.trim());
      appendToFullSessionTranscript(normalized);
    },
    [appendToFullSessionTranscript]
  );

  const getSessionTranscriptMetadata = useCallback(() => {
    const transcript = fullSessionTranscriptRef.current.trim();
    return {
      mode: "mock_interview",
      full_session_transcript: transcript || null,
      transcript_format: "text/plain",
      transcript_source: "browser_speech_recognition",
      transcript_saved_at: new Date().toISOString(),
    };
  }, []);

  const completeSession = useCallback(async (message?: string, completionReason: "score_threshold" | "question_cap" | "exhausted" | "manual" = "manual") => {
    setIsSessionStarted(false);
    setIsPaused(false);
    setShowFinishSpeakingPrompt(false);
    setIsCompleted(true);

    if (message) {
      setRecordingError(message);
    }

    if (sessionId) {
      const sessionStats = computeSessionSTARStats();
      const askedQuestionCount = questions.length > 0
        ? Math.max(1, Math.min(questions.length, currentQuestion + 1))
        : 0;
      await updateInterviewSessionStatus(sessionId, "completed", {
        ended_at: new Date().toISOString(),
        total_questions: askedQuestionCount,
        current_question_index: Math.max(0, askedQuestionCount - 1),
        metadata: {
          ...getSessionTranscriptMetadata(),
          questions_attempted: askedQuestionCount,
          completion_reason: completionReason,
          score_summary: {
            overall_average: Number(sessionStats.overallAverage.toFixed(2)),
            situation: Number(sessionStats.situation.toFixed(2)),
            task: Number(sessionStats.task.toFixed(2)),
            action: Number(sessionStats.action.toFixed(2)),
            result: Number(sessionStats.result.toFixed(2)),
            reflection: Number(sessionStats.reflection.toFixed(2)),
            evaluated_count: sessionStats.evaluatedCount,
            per_question_scores: Object.entries(evaluations || {}).map(([idx, ev]: [string, any]) => ({
              question_index: Number(idx),
              score: ev?.score ?? null,
              source: ev?.source ?? null,
              roberta_similarity: ev?.roberta_similarity ?? null,
              breakdown: ev?.breakdown ?? null,
            })),
          },
        },
      });

      const pendingTranscriptions = await triggerPendingSessionTranscriptions({
        sessionId,
        includeFailed: true,
      });
      if (pendingTranscriptions.error) {
        setRecordingError(
          `Session ended, but failed to retry pending transcriptions: ${pendingTranscriptions.error.message}`
        );
      } else if ((pendingTranscriptions.data?.failed || 0) > 0) {
        setRecordingError(
          `Session ended. Retried ${pendingTranscriptions.data?.attempted || 0} pending segments, but ${pendingTranscriptions.data?.failed || 0} still failed transcription.`
        );
      }
    }
  }, [computeSessionSTARStats, currentQuestion, evaluations, getSessionTranscriptMetadata, questions.length, sessionId]);

  const stopLiveChunkTranscription = useCallback(() => {
    const recorder = liveTranscriptionRecorderRef.current;
    liveTranscriptionRecorderRef.current = null;
    liveTranscriptionInFlightRef.current = false;
    liveTranscriptionCooldownUntilRef.current = 0;
    liveTranscriptionBackoffMsRef.current = 0;
    if (!recorder) {
      return;
    }

    recorder.ondataavailable = null;
    recorder.onerror = null;
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore stop errors
      }
    }
  }, []);

  const stopSilenceDetection = useCallback(() => {
    if (silenceDetectionAnimationRef.current !== null) {
      window.cancelAnimationFrame(silenceDetectionAnimationRef.current);
      silenceDetectionAnimationRef.current = null;
    }

    if (silenceDetectionSourceRef.current) {
      silenceDetectionSourceRef.current.disconnect();
      silenceDetectionSourceRef.current = null;
    }

    silenceDetectionAnalyserRef.current = null;

    if (silenceDetectionAudioContextRef.current) {
      const context = silenceDetectionAudioContextRef.current;
      silenceDetectionAudioContextRef.current = null;
      void context.close().catch(() => {
        // Ignore close errors from browser audio context lifecycle.
      });
    }

    silenceSpeechStartedAtRef.current = 0;
    silenceLastSpeechAtRef.current = 0;
    silenceNoiseFloorRef.current = 0.008;
  }, []);

  const triggerAutoPauseAndTranscribe = useCallback(async () => {
    if (autoPauseInFlightRef.current) {
      return;
    }

    if (!isSessionStarted || isPaused || isAdvancingNextQuestion || isDecidingNextQuestion) {
      return;
    }

    autoPauseInFlightRef.current = true;
    // Immediately show processing state once silence capture is triggered.
    setIsPauseTranscriptPending(true);
    setRecordingError("Silence detected. Saving your answer and generating transcript...");

    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        stopLiveDraftTranscription();
        stopLiveChunkTranscription();
        stopSilenceDetection();
        await new Promise<void>((resolve) => {
          pendingStopResolveRef.current = resolve;
          recorder.stop();
        });
        mediaRecorderRef.current = null;
      }

      setIsPaused(true);
      if (sessionId) {
        await updateInterviewSessionStatus(sessionId, "paused", {
          paused_at: new Date().toISOString(),
        });
      }
      await refreshTranscriptAfterPause();
      setIsAdvancingNextQuestion(true);
      try {
        setRecordingError("No speech detected. Preparing your answer now...");
        await prepareNextActionForCurrentAnswer("auto");
      } finally {
        setIsAdvancingNextQuestion(false);
      }
    } finally {
      autoPauseInFlightRef.current = false;
    }
  }, [
    isAdvancingNextQuestion,
    isDecidingNextQuestion,
    isPaused,
    isSessionStarted,
    refreshTranscriptAfterPause,
    sessionId,
    stopLiveChunkTranscription,
    stopLiveDraftTranscription,
    stopSilenceDetection,
  ]);

  const maybeShowFinishSpeakingPrompt = useCallback(() => {
    if (!isSessionStarted || isPaused || isPauseTranscriptPending || isAdvancingNextQuestion || isDecidingNextQuestion) {
      return false;
    }

    const now = Date.now();
    if (now < finishPromptCooldownUntilRef.current) {
      return false;
    }

    if (finishPromptShownByQuestionRef.current[currentQuestion]) {
      return false;
    }

    finishPromptShownByQuestionRef.current = {
      ...finishPromptShownByQuestionRef.current,
      [currentQuestion]: true,
    };
    finishPromptCooldownUntilRef.current = now + FINISH_PROMPT_COOLDOWN_MS;
    setShowFinishSpeakingPrompt(true);
    return true;
  }, [
    currentQuestion,
    isAdvancingNextQuestion,
    isDecidingNextQuestion,
    isPauseTranscriptPending,
    isPaused,
    isSessionStarted,
  ]);

  const startSilenceDetection = useCallback(
    async (activeStream: MediaStream) => {
      if (!isSessionStarted || isPaused || !isMicOn) {
        return;
      }

      const audioTracks = activeStream.getAudioTracks();
      if (audioTracks.length === 0) {
        return;
      }

      stopSilenceDetection();

      try {
        const context = new AudioContext();
        if (context.state === "suspended") {
          await context.resume().catch(() => {
            // Ignore resume failures and continue best-effort detection.
          });
        }
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        const source = context.createMediaStreamSource(new MediaStream(audioTracks));
        source.connect(analyser);

        silenceDetectionAudioContextRef.current = context;
        silenceDetectionAnalyserRef.current = analyser;
        silenceDetectionSourceRef.current = source;

        const waveform = new Float32Array(analyser.fftSize);

        const tick = () => {
          const recorder = mediaRecorderRef.current;
          if (!recorder || recorder.state !== "recording") {
            stopSilenceDetection();
            return;
          }

          analyser.getFloatTimeDomainData(waveform);
          let energy = 0;
          for (let index = 0; index < waveform.length; index += 1) {
            const sample = waveform[index];
            energy += sample * sample;
          }

          const rms = Math.sqrt(energy / waveform.length);
          const now = performance.now();
          const segmentMeta = activeSegmentMetaRef.current;
          const segmentStartedAt = segmentMeta?.startedAt || Date.now();
          const elapsedSinceSegmentStart = Date.now() - segmentStartedAt;
          const isAutoCaptureArmed = elapsedSinceSegmentStart >= AUTO_CAPTURE_ARM_DELAY_MS;
          const currentNoiseFloor = silenceNoiseFloorRef.current;
          const adaptiveThreshold = Math.max(
            AUTO_SILENCE_RMS_THRESHOLD,
            currentNoiseFloor * AUTO_SPEECH_MULTIPLIER
          );
          const isSpeech = rms >= adaptiveThreshold;

          if (!isSpeech) {
            silenceNoiseFloorRef.current =
              currentNoiseFloor + (rms - currentNoiseFloor) * AUTO_NOISE_FLOOR_ALPHA;
          }

          if (isSpeech) {
            if (silenceSpeechStartedAtRef.current === 0) {
              silenceSpeechStartedAtRef.current = now;
            }
            silenceLastSpeechAtRef.current = now;
          } else if (silenceSpeechStartedAtRef.current > 0 && silenceLastSpeechAtRef.current > 0) {
            const hasMinimumSpeech =
              now - silenceSpeechStartedAtRef.current >= AUTO_MIN_SPEECH_MS;
            const hasSustainedSilence =
              now - silenceLastSpeechAtRef.current >= AUTO_SILENCE_DURATION_MS;
            const hasExceededMaxAnswerTime =
              now - silenceSpeechStartedAtRef.current >= AUTO_MAX_ANSWER_MS;

            if (isAutoCaptureArmed && ((hasMinimumSpeech && hasSustainedSilence) || hasExceededMaxAnswerTime)) {
              void triggerAutoPauseAndTranscribe();
              stopSilenceDetection();
              return;
            }
          }

          // Hard fail-safe: auto-stop when no transcript evidence appears for too long,
          // even if ambient noise keeps RMS above the raw speech threshold.
          const draftTranscriptDelta = Math.max(
            0,
            (liveDraftTranscriptRef.current || "").trim().length - (segmentMeta?.baselineDraftChars || 0)
          );
          const liveTranscriptDelta = Math.max(
            0,
            (liveTranscriptTextRef.current || "").trim().length - (segmentMeta?.baselineLiveChars || 0)
          );
          const hasMeaningfulTranscriptSinceSegment =
            draftTranscriptDelta >= AUTO_NO_SPEECH_MIN_TRANSCRIPT_DELTA_CHARS ||
            liveTranscriptDelta >= AUTO_NO_SPEECH_MIN_TRANSCRIPT_DELTA_CHARS;

          if (
            !hasMeaningfulTranscriptSinceSegment &&
            elapsedSinceSegmentStart >= AUTO_NO_SPEECH_TIMEOUT_MS
          ) {
            setRecordingError("No speech detected. Auto-stopping and saving this segment...");
            void triggerAutoPauseAndTranscribe();
            stopSilenceDetection();
            return;
          }

          silenceDetectionAnimationRef.current = window.requestAnimationFrame(tick);
        };

        silenceDetectionAnimationRef.current = window.requestAnimationFrame(tick);
      } catch {
        stopSilenceDetection();
      }
    },
    [
      isMicOn,
      isPaused,
      isSessionStarted,
      stopSilenceDetection,
      triggerAutoPauseAndTranscribe,
    ]
  );

  const handleConfirmFinishedSpeaking = useCallback(async () => {
    setShowFinishSpeakingPrompt(false);
    await triggerAutoPauseAndTranscribe();
  }, [triggerAutoPauseAndTranscribe]);

  const handleContinueSpeaking = useCallback(async () => {
    setShowFinishSpeakingPrompt(false);
    setRecordingError("Continuing recording. You can click Next Question anytime to capture and continue.");
    const activeStream = streamRef.current;
    if (activeStream && mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      await startSilenceDetection(activeStream);
    }
  }, [startSilenceDetection]);

  const startLiveChunkTranscription = useCallback(() => {
    const activeStream = streamRef.current;
    if (!activeStream || !isMicOn || isPaused || !isSessionStarted) {
      return;
    }

    if (liveTranscriptionRecorderRef.current) {
      const currentRecorder = liveTranscriptionRecorderRef.current;
      if (currentRecorder.state !== "inactive") {
        return;
      }
    }

    const audioTracks = activeStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    const audioOnlyStream = new MediaStream(audioTracks);
    let liveRecorder: MediaRecorder;
    try {
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      liveRecorder = new MediaRecorder(audioOnlyStream, { mimeType: preferredType });
    } catch {
      return;
    }

    liveRecorder.ondataavailable = (event: BlobEvent) => {
      const chunk = event.data;
      if (!chunk || chunk.size === 0) {
        return;
      }
      if (Date.now() < liveTranscriptionCooldownUntilRef.current) {
        return;
      }
      if (liveTranscriptionInFlightRef.current) {
        return;
      }

      const chunkSessionId = activeSessionIdRef.current;
      const chunkQuestionIndex = activeQuestionIndexRef.current;

      liveTranscriptionInFlightRef.current = true;
      void (async () => {
        try {
          const { data, error } = await transcribeLiveAudioChunk({
            audioBlob: chunk,
          });

          if (
            activeSessionIdRef.current !== chunkSessionId ||
            activeQuestionIndexRef.current !== chunkQuestionIndex
          ) {
            return;
          }

          if (error) {
            const errorMessage = error.message || "";
            const isRateLimited = /\b429\b|too many requests/i.test(errorMessage);
            if (isRateLimited) {
              const nextBackoff = liveTranscriptionBackoffMsRef.current
                ? Math.min(liveTranscriptionBackoffMsRef.current * 2, 30000)
                : 4000;
              liveTranscriptionBackoffMsRef.current = nextBackoff;
              liveTranscriptionCooldownUntilRef.current = Date.now() + nextBackoff;
              setLiveDraftStatus(
                `Live transcription is briefly rate-limited. Retrying in ${Math.ceil(nextBackoff / 1000)}s...`
              );
            }
            return;
          }

          liveTranscriptionBackoffMsRef.current = 0;
          liveTranscriptionCooldownUntilRef.current = 0;
          const text = data?.transcript_text?.trim();
          if (text) {
            appendLiveChunkTranscript(text);
            setLiveDraftStatus(null);
          }
        } finally {
          liveTranscriptionInFlightRef.current = false;
        }
      })();
    };

    liveRecorder.onerror = () => {
      // Keep recording flow stable if live chunk recorder errors.
    };

    try {
      liveRecorder.start(LIVE_CHUNK_INTERVAL_MS);
      liveTranscriptionRecorderRef.current = liveRecorder;
    } catch {
      liveTranscriptionRecorderRef.current = null;
    }
  }, [appendLiveChunkTranscript, isMicOn, isPaused, isSessionStarted]);

  const startLiveDraftTranscription = useCallback(() => {
    // Brave blocks Google's Web Speech API at the network level — skip it immediately
    if (isBraveBrowser()) {
      setUseLiveChunkFallback(true);
      setLiveDraftStatus(
        "Brave browser detected. Using server-assisted transcription — transcription will appear after each recording segment is saved."
      );
      return;
    }

    const speechCtor = getSpeechRecognitionAPI();

    if (!speechCtor) {
      const isSupported = isSpeechRecognitionSupported();
      const instructions = getBrowserSpecificInstructions();

      setUseLiveChunkFallback(true);
      setLiveDraftStatus(
        isSupported
          ? `Live draft transcription is not available. ${instructions} Your recording will still be transcribed after each saved segment.`
          : `Live draft transcription is not supported in this browser. ${instructions} Your recording will still be transcribed after each saved segment.`
      );
      return;
    }

    stopLiveDraftTranscription();
    setUseLiveChunkFallback(false);
    liveDraftHasResultRef.current = false;
    speechFinalTextRef.current = "";
    setLiveDraftTranscript("");
    setLiveDraftStatus(null);

    const recognition = new speechCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      if (!liveDraftHasResultRef.current) {
        liveDraftHasResultRef.current = true;
        if (liveDraftFallbackTimerRef.current !== null) {
          window.clearTimeout(liveDraftFallbackTimerRef.current);
          liveDraftFallbackTimerRef.current = null;
        }
        setUseLiveChunkFallback(false);
      }

      let finalText = speechFinalTextRef.current;
      let interimText = "";
      const finalizedChunks: string[] = [];

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript || "";
        if (result.isFinal) {
          const normalizedChunk = transcript.trim();
          if (normalizedChunk) {
            finalText = `${finalText} ${normalizedChunk}`.trim();
            finalizedChunks.push(normalizedChunk);
          }
        } else {
          interimText += transcript;
        }
      }

      speechFinalTextRef.current = finalText;
      setLiveDraftTranscript(`${finalText} ${interimText}`.trim());
      if (finalizedChunks.length > 0) {
        appendToFullSessionTranscript(finalizedChunks.join(" "));
      }
    };

    recognition.onerror = (event: any) => {
      if (liveDraftFallbackTimerRef.current !== null) {
        window.clearTimeout(liveDraftFallbackTimerRef.current);
        liveDraftFallbackTimerRef.current = null;
      }
      
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setUseLiveChunkFallback(true);
        const isBrave = isBraveBrowser();
        const helpText = isBrave ? " (Brave detected - check microphone permissions in Settings)" : "";
        setLiveDraftStatus(`Speech recognition permission was blocked. Allow microphone access and restart the session.${helpText}`);
        return;
      }
      
      if (event?.error === "audio-capture") {
        setUseLiveChunkFallback(true);
        setLiveDraftStatus("No microphone input detected for live draft transcription.");
        return;
      }
      
      if (event?.error === "network") {
        setUseLiveChunkFallback(true);
        setLiveDraftStatus("Network error during speech recognition. Switching to server-assisted transcription.");
        return;
      }
      
      if (event?.error === "service-not-available") {
        setUseLiveChunkFallback(true);
        setLiveDraftStatus("Speech recognition service is not available. Your recording will be transcribed after each segment.");
        return;
      }
      
      // Keep UI stable even when browser speech recognition emits transient errors.
    };

    recognition.onend = () => {
      if (
        speechRecognitionRef.current === recognition &&
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          recognition.start();
        } catch {
          // ignore restart errors
        }
      }
    };

    try {
      recognition.start();
      speechRecognitionRef.current = recognition;
      liveDraftFallbackTimerRef.current = window.setTimeout(() => {
        const recorder = mediaRecorderRef.current;
        const shouldFallback =
          speechRecognitionRef.current === recognition &&
          recorder &&
          recorder.state !== "inactive" &&
          !liveDraftHasResultRef.current;

        if (shouldFallback) {
          setUseLiveChunkFallback(true);
          setLiveDraftStatus("Switching to server-assisted live transcription...");
        }
      }, LIVE_DRAFT_FALLBACK_TIMEOUT_MS);
    } catch (error) {
      setUseLiveChunkFallback(true);
      speechRecognitionRef.current = null;
      const errorMsg = (error as any)?.message || '';
      const isBrave = isBraveBrowser();
      const helpText = isBrave ? " (Brave detected - verify microphone permissions)" : '';
      setLiveDraftStatus(
        `Live draft transcription could not start in this browser session.${helpText} Your recording will still be transcribed after each saved segment.`
      );
    }
  }, [appendToFullSessionTranscript, stopLiveDraftTranscription]);

  const persistSegmentBlob = useCallback(
    async (segmentBlob: Blob, segmentMeta: ActiveSegmentMeta) => {
      const activeSessionId = segmentMeta.sessionId;
      const activeStoragePrefix = segmentMeta.storagePrefix;

      const safeQuestionNumber = String(segmentMeta.questionIndex + 1).padStart(2, "0");
      const safeSegmentNumber = String(segmentMeta.segmentOrder).padStart(2, "0");
      const extension = segmentBlob.type.includes("webm") ? "webm" : "mp4";
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const storagePath = `${activeStoragePrefix}/q${safeQuestionNumber}_seg${safeSegmentNumber}_${uniqueSuffix}.${extension}`;
      const durationSeconds = Number(((Date.now() - segmentMeta.startedAt) / 1000).toFixed(2));

      setIsUploadingSegment(true);

      // Never let fast live-transcribe block segment persistence.
      const directTranscriptionPromise = Promise.race([
        transcribeLiveAudioChunk({ audioBlob: segmentBlob }),
        new Promise<{ data: null; error: Error }>((resolve) => {
          window.setTimeout(() => {
            resolve({
              data: null,
              error: new Error("Live transcription timed out"),
            });
          }, LIVE_TRANSCRIBE_REQUEST_TIMEOUT_MS);
        }),
      ]);

      const uploadResult = await uploadInterviewRecordingSegment({
        storagePath,
        segmentBlob,
        contentType: segmentBlob.type || "video/webm",
      });

      const directTranscriptionResult = await directTranscriptionPromise;

      const directTranscriptText =
        (directTranscriptionResult.data?.transcript_text || "").trim();
      const directTranscriptionFailed = Boolean(directTranscriptionResult?.error);
      const draftTranscriptFallback = extractSegmentTranscriptFallback(
        segmentMeta,
        liveDraftTranscriptRef.current,
        liveTranscriptTextRef.current
      );
      const hasDraftTranscriptFallback = Boolean(draftTranscriptFallback);
      const transcriptToPersist = directTranscriptionFailed
        ? draftTranscriptFallback
        : directTranscriptText;
      const shouldMarkCompleted = !directTranscriptionFailed || hasDraftTranscriptFallback;

      if (!directTranscriptionFailed) {
        setLatestWhisperStatus("completed");
        setLiveTranscriptText(directTranscriptText || null);

        if (!(liveDraftTranscript || "").trim() && directTranscriptText) {
          appendToFullSessionTranscript(directTranscriptText);
        }
      }

      if (uploadResult.error) {
        setIsUploadingSegment(false);
        setRecordingError(`Failed to upload video segment: ${uploadResult.error.message}`);
        return;
      }

      const segmentResult = await insertRecordingSegmentMetadata({
        sessionId: activeSessionId,
        questionId: segmentMeta.questionId,
        questionIndex: segmentMeta.questionIndex,
        segmentOrder: segmentMeta.segmentOrder,
        storagePath,
        mimeType: segmentBlob.type || "video/webm",
        durationSeconds,
        fileSizeBytes: segmentBlob.size,
        status: shouldMarkCompleted ? "transcribed" : "uploaded",
        whisperStatus: shouldMarkCompleted ? "completed" : "pending",
        transcriptText: transcriptToPersist || null,
        metadata: {
          recorded_at: new Date(segmentMeta.startedAt).toISOString(),
          direct_transcription: {
            success: !directTranscriptionFailed,
            source: "frontend_blob_to_backend_whisper",
            error: directTranscriptionResult.error?.message || null,
          },
          draft_transcript_fallback: {
            used: hasDraftTranscriptFallback,
            source: hasDraftTranscriptFallback ? "browser_live_draft" : null,
          },
        },
      });

      setIsUploadingSegment(false);
      if (segmentResult.error) {
        setRecordingError(`Failed to save segment metadata: ${segmentResult.error.message}`);
        return;
      }

      const createdSegmentId = segmentResult.data?.id;
      if (createdSegmentId && directTranscriptionFailed && !hasDraftTranscriptFallback) {
        void (async () => {
          const transcriptionResult = await triggerSegmentTranscription({
            sessionId: activeSessionId,
            segmentId: createdSegmentId,
          });
          if (transcriptionResult.error) {
            setRecordingError(
              "Segment saved. Transcription service is temporarily unreachable; it will retry in the background."
            );
            window.setTimeout(() => {
              void triggerSegmentTranscription({
                sessionId: activeSessionId,
                segmentId: createdSegmentId,
                force: true,
              });
            }, 12000);
          } else {
            setRecordingError("Segment saved. Final transcription completed after retry.");
          }
        })();
      } else if (directTranscriptionFailed && !hasDraftTranscriptFallback) {
        setRecordingError(
          "Segment saved. Fast transcription is temporarily unavailable; the system will retry."
        );
      } else if (directTranscriptionFailed && hasDraftTranscriptFallback) {
        setRecordingError(
          "Segment saved with draft transcript fallback while server transcription is unavailable."
        );
      }

      setSavedSegmentCount((prev) => prev + 1);
      if (!directTranscriptionFailed) {
        setRecordingError(null);
      }
    },
    [appendToFullSessionTranscript, liveDraftTranscript]
  );

  const startSegmentRecording = useCallback(
    async (
      questionIndex: number,
      sessionContext?: { sessionId: string; storagePrefix: string },
      questionOverride?: Question
    ) => {
      const activeSessionId = sessionContext?.sessionId || sessionId;
      const activeStoragePrefix = sessionContext?.storagePrefix || storagePrefix;

      if (!activeSessionId || !activeStoragePrefix) {
        setRecordingError("Session metadata missing. Please click End Session, then Start Session again.");
        return false;
      }

      if (!isMicOn) {
        setRecordingError("Microphone is muted. Unmute to start recording.");
        return false;
      }

      const mediaStream = streamRef.current;
      if (!mediaStream) {
        setRecordingError("Camera stream not ready. Please turn camera on and try again.");
        return false;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        return true;
      }

      const question = questionOverride || questions[questionIndex];
      if (!question) {
        setRecordingError("Question not available for recording.");
        return false;
      }

      try {
        const mimeType = getSupportedRecordingMimeType();
        const mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
        recordingChunksRef.current = [];
        const persistableQuestionId = question.baseQuestionId || question.id;
        activeSegmentMetaRef.current = {
          sessionId: activeSessionId,
          storagePrefix: activeStoragePrefix,
          questionId: question.source === "followup" ? question.baseQuestionId || null : persistableQuestionId,
          questionIndex,
          segmentOrder: segmentOrderRef.current,
          startedAt: Date.now(),
          baselineDraftChars: (liveDraftTranscriptRef.current || "").trim().length,
          baselineLiveChars: (liveTranscriptTextRef.current || "").trim().length,
        };

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stopLiveDraftTranscription();
          stopSilenceDetection();
          const chunks = [...recordingChunksRef.current];
          recordingChunksRef.current = [];
          const segmentMeta = activeSegmentMetaRef.current;
          activeSegmentMetaRef.current = null;

          try {
            if (chunks.length > 0 && segmentMeta) {
              const segmentBlob = new Blob(chunks, { type: mediaRecorder.mimeType || mimeType });
              await Promise.race([
                persistSegmentBlob(segmentBlob, segmentMeta),
                new Promise((_, reject) => {
                  window.setTimeout(() => {
                    reject(new Error("Segment persistence timed out"));
                  }, SEGMENT_PERSIST_TIMEOUT_MS);
                }),
              ]);
              segmentOrderRef.current += 1;
            }
          } catch (error: any) {
            const message =
              error?.message === "Segment persistence timed out"
                ? "Saving this answer is taking too long. You can continue; the segment will keep retrying in the background."
                : "Segment processing hit an issue, but you can continue to the next question.";
            setRecordingError(message);
          } finally {
            if (pendingStopResolveRef.current) {
              pendingStopResolveRef.current();
              pendingStopResolveRef.current = null;
            }
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        await startSilenceDetection(mediaStream);
        startLiveDraftTranscription();
        setRecordingError(null);
        return true;
      } catch (error) {
        setRecordingError("Unable to start recording. Check browser permissions and try again.");
        return false;
      }
    },
    [
      getSupportedRecordingMimeType,
      isMicOn,
      persistSegmentBlob,
      questions,
      sessionId,
      startLiveDraftTranscription,
      startSilenceDetection,
      storagePrefix,
      stopSilenceDetection,
      stopLiveDraftTranscription,
    ]
  );

  useEffect(() => {
    if (isSessionStarted && (!sessionId || !storagePrefix)) {
      setIsSessionStarted(false);
      setIsPaused(false);
      setRecordingError("Session metadata was lost after refresh. Start Session again to continue recording.");
    }
  }, [isSessionStarted, sessionId, storagePrefix]);

  const stopActiveRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    stopLiveDraftTranscription();
    stopLiveChunkTranscription();
    stopSilenceDetection();

    await new Promise<void>((resolve) => {
      let resolved = false;
      const finalize = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      const timeoutId = window.setTimeout(() => {
        setRecordingError(
          "Recording stop took too long. Continuing with the next step while save retries in background."
        );
        finalize();
      }, STOP_RECORDING_FALLBACK_TIMEOUT_MS);

      pendingStopResolveRef.current = () => {
        window.clearTimeout(timeoutId);
        finalize();
      };

      try {
        recorder.stop();
      } catch {
        window.clearTimeout(timeoutId);
        pendingStopResolveRef.current = null;
        finalize();
      }
    });
    mediaRecorderRef.current = null;
  }, [stopLiveChunkTranscription, stopLiveDraftTranscription, stopSilenceDetection]);

  const handleTabHiddenPause = useCallback(async () => {
    if (tabBackgroundPauseInFlightRef.current) {
      return;
    }

    if (!isSessionStarted || isPaused || isPauseTranscriptPending) {
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    tabBackgroundPauseInFlightRef.current = true;
    setRecordingError("Tab switched. Auto-saving your current answer...");

    try {
      await stopActiveRecording();
      setIsPaused(true);
      if (sessionId) {
        await updateInterviewSessionStatus(sessionId, "paused", {
          paused_at: new Date().toISOString(),
          paused_reason: "tab_hidden",
        });
      }
      await refreshTranscriptAfterPause();
      setRecordingError("Answer saved. Return to this tab and click Confirm to continue.");
    } finally {
      persistSnapshot();
      tabBackgroundPauseInFlightRef.current = false;
    }
  }, [
    isPauseTranscriptPending,
    isPaused,
    persistSnapshot,
    isSessionStarted,
    refreshTranscriptAfterPause,
    sessionId,
    stopActiveRecording,
    updateInterviewSessionStatus,
  ]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (!isSessionStarted || !isPaused) {
        return;
      }

      const hasTranscriptText = Boolean(
        (liveDraftTranscript || "").trim() || (liveTranscriptText || "").trim()
      );
      if (!hasTranscriptText) {
        void refreshTranscriptAfterPause();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    isPaused,
    isSessionStarted,
    liveDraftTranscript,
    liveTranscriptText,
    refreshTranscriptAfterPause,
  ]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        void handleTabHiddenPause();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [handleTabHiddenPause]);

  const prepareNextActionForCurrentAnswer = useCallback(
    async (triggerSource: "manual" | "auto") => {
      const activeQuestion = questions[currentQuestion];
      if (!activeQuestion) {
        return;
      }

      const baseQuestionId = activeQuestion.baseQuestionId || activeQuestion.id;
      const followupCountForCurrent = followupCountByBase[baseQuestionId] || 0;
      const answerText = (liveDraftTranscript || liveTranscriptText || "").trim();
      const candidateAnswer = answerText || "No clear answer captured from transcript.";

      const askedQuestionCount = questions.length;
      const sessionStarAverage = calculateSessionStarAverage();
      const hasReachedMinimumQuestions = askedQuestionCount >= MIN_SESSION_QUESTION_COUNT;
      const hasReachedStarAverageTarget = sessionStarAverage >= STAR_AVERAGE_TARGET_SCORE;

      const evaluationEntries = Object.entries(evaluations || {});
      const evaluatedCount = evaluationEntries.length;
      const currentScoreSum = evaluatedCount > 0 ? sessionStarAverage * evaluatedCount : 0;
      const mandatoryQuestionsRemaining = Math.max(
        MIN_SESSION_QUESTION_COUNT - askedQuestionCount,
        0
      );
      const projectedBestCaseAverageAtMinimum =
        evaluatedCount + mandatoryQuestionsRemaining > 0
          ? (currentScoreSum + mandatoryQuestionsRemaining * 5) /
            (evaluatedCount + mandatoryQuestionsRemaining)
          : 5;

      const currentEvaluation = evaluations[currentQuestion];
      const currentBreakdown = currentEvaluation?.breakdown;
      const currentDims = currentBreakdown
        ? [
            Number(currentBreakdown.situation),
            Number(currentBreakdown.task),
            Number(currentBreakdown.action),
            Number(currentBreakdown.result),
            Number(currentBreakdown.reflection),
          ].filter(Number.isFinite)
        : [];
      const currentQuestionStarAverage =
        currentDims.length === 5
          ? currentDims.reduce((sum, value) => sum + value, 0) / 5
          : Number.isFinite(Number(currentEvaluation?.score))
          ? Number(currentEvaluation?.score)
          : null;

      const hasScoreDeficit = sessionStarAverage < STAR_AVERAGE_TARGET_SCORE;
      const currentAnswerIsBelowTarget =
        typeof currentQuestionStarAverage === "number" &&
        currentQuestionStarAverage < STAR_AVERAGE_TARGET_SCORE;
      const followupNeededForTarget =
        hasScoreDeficit &&
        (currentAnswerIsBelowTarget ||
          projectedBestCaseAverageAtMinimum < STAR_AVERAGE_TARGET_SCORE);

      const preparedMessage =
        triggerSource === "auto"
          ? "No-speech capture finalized. Decision is ready. Click Next Question to continue, or Restart Answer to try again."
          : "Answer finalized. Decision is ready. Click Next Question again to continue, or Restart Answer to try again.";
      const completeMessage =
        triggerSource === "auto"
          ? "No-speech capture finalized. Click Next Question to complete the session, or Restart Answer to retry this question."
          : "Answer finalized. Click Next Question again to complete the session, or Restart Answer to retry this question.";

      if (askedQuestionCount >= MAX_SESSION_QUESTION_COUNT) {
        setPreparedNextAction({
          kind: "complete",
          message: `Session ended after reaching the maximum of ${MAX_SESSION_QUESTION_COUNT} questions. Final STAR average: ${sessionStarAverage.toFixed(2)} / 5.`,
          completionReason: "question_cap",
        });
        setRecordingError(completeMessage);
        return;
      }

      if (hasReachedMinimumQuestions && hasReachedStarAverageTarget) {
        setPreparedNextAction({
          kind: "complete",
          message: `Session completed successfully after ${askedQuestionCount} questions. STAR average reached ${sessionStarAverage.toFixed(2)} / 5 (target ${STAR_AVERAGE_TARGET_SCORE.toFixed(1)}).`,
          completionReason: "score_threshold",
        });
        setRecordingError(completeMessage);
        return;
      }

      const conversationHistory = questions
        .slice(0, currentQuestion)
        .map((q, idx) => ({
          question: q.question,
          answer: ((evaluations[idx] as any)?.transcript || "").slice(0, 200),
        }))
        .filter((pair) => pair.answer.length > 5)
        .slice(-3);

      setIsDecidingNextQuestion(true);
      let decisionResult;
      try {
        decisionResult = await decideNextQuestionStepTyped({
          currentQuestion: activeQuestion.question,
          candidateAnswer,
          category: activeQuestion.type,
          remainingBankQuestions: bankQuestionPool.length,
          followupCountForCurrent,
          bankQuestionPool: bankQuestionPool.map((q) => ({ id: q.id, question: q.question })),
          evaluationSource: currentEvaluation?.source,
          conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        });
      } finally {
        setIsDecidingNextQuestion(false);
      }

      const shouldAskFollowup =
        !decisionResult.error &&
        decisionResult.data?.action === "follow_up" &&
        Boolean(decisionResult.data?.followup_question) &&
        followupNeededForTarget;

      const shouldUseEmergencyFollowup =
        Boolean(decisionResult.error) &&
        followupNeededForTarget &&
        followupCountForCurrent < 1;

      if (shouldAskFollowup) {
        if (questions.length >= MAX_SESSION_QUESTION_COUNT) {
          setPreparedNextAction({
            kind: "complete",
            message: `Session ended after reaching the maximum of ${MAX_SESSION_QUESTION_COUNT} questions.`,
            completionReason: "question_cap",
          });
          setRecordingError(completeMessage);
          return;
        }

        const followupQuestion: Question = {
          id: `followup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "Follow-up",
          question: decisionResult.data.followup_question,
          tip: "Answer with concrete details and measurable outcomes.",
          source: "followup",
          baseQuestionId,
        };

        // Skip if this follow-up is a duplicate of any already-asked question
        const existingKeys = new Set(questions.map((q) => normalizeQuestionKey(q.question)).filter(Boolean));
        if (existingKeys.has(normalizeQuestionKey(followupQuestion.question))) {
          // Fall through to bank question instead
        } else {
          setPreparedNextAction({
            kind: "followup",
            question: followupQuestion,
            nextQuestionIndex: questions.length,
            baseQuestionId,
          });
          setRecordingError(preparedMessage);
          return;
        }
      }

      if (shouldUseEmergencyFollowup) {
        if (questions.length >= MAX_SESSION_QUESTION_COUNT) {
          setPreparedNextAction({
            kind: "complete",
            message: `Session ended after reaching the maximum of ${MAX_SESSION_QUESTION_COUNT} questions.`,
            completionReason: "question_cap",
          });
          setRecordingError(completeMessage);
          return;
        }

        const emergencyQuestion: Question = {
          id: `fallback-followup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "Follow-up",
          question: buildEmergencyFollowupQuestion(candidateAnswer, activeQuestion.question),
          tip: "Answer with concrete details and measurable outcomes.",
          source: "followup",
          baseQuestionId,
        };

        // Skip if emergency follow-up duplicates an existing question
        const existingKeysEmergency = new Set(questions.map((q) => normalizeQuestionKey(q.question)).filter(Boolean));
        if (!existingKeysEmergency.has(normalizeQuestionKey(emergencyQuestion.question))) {
          setPreparedNextAction({
            kind: "followup",
            question: emergencyQuestion,
            nextQuestionIndex: questions.length,
            baseQuestionId,
          });
          setRecordingError(
            "Decision API is temporarily unavailable. A recovery follow-up is ready. Click Next Question again to continue."
          );
          return;
        }
      }

      // Handle AI-generated next question (Phi3 decided no bank question fits the topic)
      const shouldUseAIGeneratedQuestion =
        !decisionResult.error &&
        decisionResult.data?.action === "next_question_new" &&
        Boolean(decisionResult.data?.generated_question) &&
        questions.length < MAX_SESSION_QUESTION_COUNT;

      if (shouldUseAIGeneratedQuestion) {
        const generatedText: string = decisionResult.data.generated_question;
        const existingKeysAI = new Set(questions.map((q) => normalizeQuestionKey(q.question)).filter(Boolean));

        // Check if any bank question is similar — if so, prefer the bank version
        const similarBankQ = findSimilarBankQuestion(generatedText, bankQuestionPool);
        if (similarBankQ && !existingKeysAI.has(normalizeQuestionKey(similarBankQ.question))) {
          const remainingPool = bankQuestionPool.filter((q) => q.id !== similarBankQ.id);
          setPreparedNextAction({
            kind: "bank",
            question: similarBankQ,
            nextQuestionIndex: questions.length,
            remainingPool,
          });
          setRecordingError(preparedMessage);
          return;
        }

        // No bank match — use Phi3's generated question
        if (!existingKeysAI.has(normalizeQuestionKey(generatedText))) {
          const aiQuestion: Question = {
            id: decisionResult.data?.generated_question_bank_id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "AI Generated",
            question: generatedText,
            tip: "Answer with concrete details and measurable outcomes.",
            source: "bank",
            baseQuestionId,
          };
          setPreparedNextAction({
            kind: "bank",
            question: aiQuestion,
            nextQuestionIndex: questions.length,
            remainingPool: bankQuestionPool, // pool unchanged — question came from AI
          });
          setRecordingError(preparedMessage);
          return;
        }
      }

      let nextPool = bankQuestionPool;
      if (nextPool.length === 0 && questions.length < MAX_SESSION_QUESTION_COUNT) {
        const remainingSlots = MAX_SESSION_QUESTION_COUNT - questions.length;
        const refillLimit = Math.min(RANDOM_BANK_QUESTION_COUNT, remainingSlots);
        const refill = await fetchAdditionalBankQuestions(refillLimit);
        if (refill.length > 0) {
          nextPool = refill;
          setBankQuestionPool(refill);
          bankQuestionPoolRef.current = refill;
        }
      }

      if (nextPool.length > 0) {
        const selectedId = decisionResult.data?.selected_question_id;
        const selectedIdx = selectedId ? nextPool.findIndex((q) => q.id === selectedId) : -1;
        const orderedPool =
          selectedIdx > 0
            ? [nextPool[selectedIdx], ...nextPool.slice(0, selectedIdx), ...nextPool.slice(selectedIdx + 1)]
            : nextPool;
        const [nextBankQuestion, ...remainingPool] = orderedPool;
        setPreparedNextAction({
          kind: "bank",
          question: nextBankQuestion,
          nextQuestionIndex: questions.length,
          remainingPool,
        });
        setRecordingError(preparedMessage);
        return;
      }

      const minimumMsg = hasReachedMinimumQuestions
        ? ""
        : ` Minimum required is ${MIN_SESSION_QUESTION_COUNT} questions.`;
      setPreparedNextAction({
        kind: "complete",
        message: `Session ended because no more questions are available in the bank.${minimumMsg} Final STAR average: ${sessionStarAverage.toFixed(2)} / 5.`,
        completionReason: "exhausted",
      });
      setRecordingError(completeMessage);
    },
    [
      bankQuestionPool,
      calculateSessionStarAverage,
      currentQuestion,
      fetchAdditionalBankQuestions,
      followupCountByBase,
      liveDraftTranscript,
      liveTranscriptText,
      evaluations,
      questions,
    ]
  );

  const handleNextQuestion = useCallback(async () => {
    if (nextQuestionInFlightRef.current) {
      return;
    }

    nextQuestionInFlightRef.current = true;
    setIsAdvancingNextQuestion(true);

    try {
      if (questions.length === 0) {
        return;
      }

      if (isDecidingNextQuestion) {
        return;
      }

      if (preparedNextAction) {
        if (preparedNextAction.kind === "complete") {
          setPreparedNextAction(null);
          await completeSession(preparedNextAction.message, preparedNextAction.completionReason);
          return;
        }

        const preparedQuestion = preparedNextAction.question;
        const nextQuestionIndex = preparedNextAction.nextQuestionIndex;
        activeQuestionIndexRef.current = nextQuestionIndex;
        setLiveTranscriptText(null);
        setLatestWhisperStatus(null);
        setIsPauseTranscriptPending(false);
        setLiveDraftTranscript("");

        if (preparedNextAction.kind === "followup") {
          const baseQuestionId = preparedNextAction.baseQuestionId;
          setQuestions((previous) => [...previous, preparedQuestion]);
          setFollowupCountByBase((previous) => ({
            ...previous,
            [baseQuestionId]: (previous[baseQuestionId] || 0) + 1,
          }));
        } else {
          setQuestions((previous) => [...previous, preparedQuestion]);
          setBankQuestionPool(preparedNextAction.remainingPool);
          bankQuestionPoolRef.current = preparedNextAction.remainingPool;
        }

        setCurrentQuestion(nextQuestionIndex);
        await syncSessionResumeState(nextQuestionIndex);
        setPreparedNextAction(null);
        setRecordingError(null);
        setIsPaused(false);
        await startSegmentRecording(nextQuestionIndex, undefined, preparedQuestion);
        return;
      }

      const hasDraftTranscript = Boolean((liveDraftTranscript || "").trim());
      if (isPauseTranscriptPending && !hasDraftTranscript) {
        setRecordingError(
          "Transcription is still processing for your latest captured answer. Please wait a moment, then click Next Question again."
        );
        return;
      }

      if (!isPaused) {
        setRecordingError("Preparing your answer now. Please wait...");
        await stopActiveRecording();
        setIsPaused(true);
        if (sessionId) {
          await updateInterviewSessionStatus(sessionId, "paused", {
            paused_at: new Date().toISOString(),
          });
        }
        const hasDraftAfterPause = Boolean((liveDraftTranscript || "").trim());
        if (hasDraftAfterPause) {
          void refreshTranscriptAfterPause();
        } else {
          await refreshTranscriptAfterPause();
        }
      }

      await stopActiveRecording();
      await prepareNextActionForCurrentAnswer("manual");
    } finally {
      nextQuestionInFlightRef.current = false;
      setIsAdvancingNextQuestion(false);
    }
  }, [
    preparedNextAction,
    completeSession,
    isDecidingNextQuestion,
    isAdvancingNextQuestion,
    isPauseTranscriptPending,
    isPaused,
    liveDraftTranscript,
    liveTranscriptText,
    prepareNextActionForCurrentAnswer,
    questions,
    refreshTranscriptAfterPause,
    sessionId,
    syncSessionResumeState,
    startSegmentRecording,
    stopActiveRecording,
    updateInterviewSessionStatus,
  ]);

  const handleRestartCurrentAnswer = useCallback(async () => {
    if (!isSessionStarted) {
      return;
    }

    if (!isPaused || isPauseTranscriptPending || isUploadingSegment || isDecidingNextQuestion || isAdvancingNextQuestion) {
      return;
    }

    await stopActiveRecording();
    setLiveTranscriptText(null);
    setLatestWhisperStatus(null);
    setIsPauseTranscriptPending(false);
    setPreparedNextAction(null);
    setLiveDraftTranscript("");
    speechFinalTextRef.current = "";

    const nextLastEvaluated = { ...lastEvaluatedTranscriptRef.current };
    delete nextLastEvaluated[currentQuestion];
    lastEvaluatedTranscriptRef.current = nextLastEvaluated;

    setEvaluations((previous) => {
      if (!previous || !(currentQuestion in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[currentQuestion];
      try {
        if (stateKey) {
          localStorage.setItem(`${stateKey}_evaluations`, JSON.stringify(next));
        }
      } catch {
        // ignore storage errors
      }
      return next;
    });

    if (sessionId) {
      await updateInterviewSessionStatus(sessionId, "in_progress", {
        resumed_at: new Date().toISOString(),
      });

      // Delete all previously saved segments for this question (rejected attempts)
      const { deletedCount } = await deleteSegmentsForQuestion({
        sessionId,
        questionIndex: currentQuestion,
      });
      if (deletedCount > 0) {
        setSavedSegmentCount((prev) => Math.max(0, prev - deletedCount));
      }
    }

    setRecordingError("Current answer restarted. Record your response again and wait for automatic capture.");
    setIsPaused(false);
    await startSegmentRecording(currentQuestion);
  }, [
    currentQuestion,
    isAdvancingNextQuestion,
    isDecidingNextQuestion,
    isPauseTranscriptPending,
    isPaused,
    isSessionStarted,
    isUploadingSegment,
    setPreparedNextAction,
    sessionId,
    startSegmentRecording,
    stateKey,
    stopActiveRecording,
  ]);

  const handlePracticeAgain = () => {
    setHasStarted(false);
    setIsSessionStarted(false);
    setIsPaused(false);
    setShowFinishSpeakingPrompt(false);
    setIsCompleted(false);
    setCurrentQuestion(0);
    setIsCameraOn(false);
    setIsMicOn(true);
    setMediaError(null);
    setMicTestError(null);
    setQuestions([]);
    setBankQuestionPool([]);
    bankQuestionPoolRef.current = [];
    setFollowupCountByBase({});
    setIsDecidingNextQuestion(false);
    setIsAdvancingNextQuestion(false);
    setPreparedNextAction(null);
    setQuestionsError(null);
    setRecordingError(null);
    setLiveDraftTranscript("");
    setFullSessionTranscript("");
    fullSessionTranscriptRef.current = "";
    setLiveDraftStatus(null);
    setSessionId(null);
    setStoragePrefix(null);
    setSavedSegmentCount(0);
    segmentOrderRef.current = 1;
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    activeSegmentMetaRef.current = null;
    nextQuestionInFlightRef.current = false;
    activeSessionIdRef.current = null;
    stopLiveDraftTranscription();
    stopLiveChunkTranscription();
    stopCamera();
    void stopMicLoopback();
  };

  const handleExportSummary = useCallback(async () => {
    // Load SheetJS from CDN
    if (!(window as any).XLSX) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load SheetJS"));
        document.head.appendChild(s);
      });
    }
    const XLSX = (window as any).XLSX;

    const sessionStats = computeSessionSTARStats();
    const now = new Date().toLocaleString();
    const dateSlug = new Date().toISOString().slice(0, 10);

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const summaryRows = [
      { Field: "Student Name",              Value: userName || "N/A" },
      { Field: "Session ID",                Value: sessionId || "N/A" },
      { Field: "Export Date",               Value: now },
      { Field: "Overall Avg Score (1–5)",   Value: sessionStats.evaluatedCount > 0 ? sessionStats.overallAverage.toFixed(2) : "—" },
      { Field: "Answers Evaluated",         Value: String(sessionStats.evaluatedCount) },
      { Field: "Situation Clarity",         Value: sessionStats.evaluatedCount > 0 ? sessionStats.situation.toFixed(2) : "—" },
      { Field: "Task Ownership",            Value: sessionStats.evaluatedCount > 0 ? sessionStats.task.toFixed(2) : "—" },
      { Field: "Action Taken",              Value: sessionStats.evaluatedCount > 0 ? sessionStats.action.toFixed(2) : "—" },
      { Field: "Result Measurability",      Value: sessionStats.evaluatedCount > 0 ? sessionStats.result.toFixed(2) : "—" },
      { Field: "Reflection & Learning",     Value: sessionStats.evaluatedCount > 0 ? sessionStats.reflection.toFixed(2) : "—" },
      { Field: "Note",                      Value: "STAR breakdown dimensions are scored per dimension by the ZSL classifier and scaled to align with the overall score. Minor differences between the breakdown average and the overall score may occur due to integer rounding." },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 60 }];

    // ── Sheet 2: Question Details ─────────────────────────────────────────────
    const questionRows = questions.map((q, idx) => {
      const ev = (evaluations as Record<number, any>)[idx];
      const bd = ev?.breakdown || {};
      const score = ev?.score ?? (Object.keys(bd).length > 0
        ? (Object.values(bd).reduce((s: number, v) => s + (Number(v) || 0), 0) as number) / Object.keys(bd).length
        : null);
      const transcript = lastEvaluatedTranscriptRef.current[idx] || ev?.transcript || "—";
      return {
        "Q#":               idx + 1,
        "Question":         q.question,
        "Answer Transcript": transcript,
        "Score (1–5)":      score != null ? Number(score).toFixed(2) : "—",
        "HR Label":         ev?.hrLabel ?? "—",
        "Situation":        bd.situation != null ? Number(bd.situation) : "—",
        "Task":             bd.task != null ? Number(bd.task) : "—",
        "Action":           bd.action != null ? Number(bd.action) : "—",
        "Result":           bd.result != null ? Number(bd.result) : "—",
        "Reflection":       bd.reflection != null ? Number(bd.reflection) : "—",
        "Evaluated At":     ev?.evaluatedAt ? new Date(ev.evaluatedAt).toLocaleString() : "—",
      };
    });
    const wsDetail = XLSX.utils.json_to_sheet(questionRows);
    wsDetail["!cols"] = [
      { wch: 4 }, { wch: 45 }, { wch: 60 }, { wch: 12 }, { wch: 30 },
      { wch: 11 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 22 },
    ];

    // Apply formatting (wrap text + center + bold header)
    const range = XLSX.utils.decode_range(wsDetail["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!wsDetail[addr]) continue;
        wsDetail[addr].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          font: R === 0 ? { bold: true } : {},
        };
      }
    }

    // ── Sheet 3: Full Transcript ──────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Question Details");

    if (fullSessionTranscript.trim()) {
      const wsTranscript = XLSX.utils.aoa_to_sheet([["Full Session Transcript"], [fullSessionTranscript.trim()]]);
      wsTranscript["!cols"] = [{ wch: 100 }];
      XLSX.utils.book_append_sheet(wb, wsTranscript, "Full Transcript");
    }

    const studentSlug = (userName || "student").replace(/\s+/g, "_").toLowerCase();
    XLSX.writeFile(wb, `interview_${studentSlug}_${dateSlug}.xlsx`);
  }, [computeSessionSTARStats, evaluations, fullSessionTranscript, questions, sessionId, userName]);

  const handleBackToDashboard = useCallback(async () => {
    if (isSessionStarted) {
      const confirmed = await messageBox.confirm({
        title: "End Session?",
        message: "A session is in progress. Leaving now will end your session. Continue?",
        tone: "warning",
      });
      if (!confirmed) return;
    }
    if (sessionId) {
      const answeredCount = Object.keys(evaluations || {}).length;
      await updateInterviewSessionStatus(sessionId, "ended", {
        ended_at: new Date().toISOString(),
        total_questions: answeredCount,
      });
    }
    handlePracticeAgain();
    setShowHistoryView(true);
  }, [isSessionStarted, messageBox, sessionId, evaluations, handlePracticeAgain, setShowHistoryView]);

  useEffect(() => {
    try {
      const initialState = window.history.state || {};
      if (!hasInitializedHistoryStateRef.current) {
        window.history.replaceState(
          {
            ...initialState,
            __mockInterviewFlow: true,
            mockInterviewStep: currentViewStep,
          },
          ""
        );
        hasInitializedHistoryStateRef.current = true;
        return;
      }

      if (isApplyingPopstateRef.current) {
        isApplyingPopstateRef.current = false;
        return;
      }

      const previousStep = window.history.state?.mockInterviewStep;
      if (previousStep === currentViewStep) {
        return;
      }

      window.history.pushState(
        {
          ...(window.history.state || {}),
          __mockInterviewFlow: true,
          mockInterviewStep: currentViewStep,
        },
        ""
      );
    } catch (error) {
      console.warn("Failed to sync mock interview history state:", error);
    }
  }, [currentViewStep]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const step = event.state?.mockInterviewStep;
      if (!event.state?.__mockInterviewFlow || !step) {
        return;
      }

      isApplyingPopstateRef.current = true;

      if (step === "history") {
        handlePracticeAgain();
        setShowHistoryView(true);
        return;
      }

      if (step === "ready") {
        handlePracticeAgain();
        setShowHistoryView(false);
        return;
      }

      if (step === "session") {
        setShowHistoryView(false);
        setHasStarted(true);
        setIsCompleted(false);
        return;
      }

      if (step === "completed") {
        setShowHistoryView(false);
        setHasStarted(true);
        setIsCompleted(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [handlePracticeAgain]);

  const stopCamera = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopMicLoopback = useCallback(async () => {
    setIsMicLoopbackOn(false);
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micGainRef.current) {
      micGainRef.current.disconnect();
      micGainRef.current = null;
    }
    if (micTestStreamRef.current) {
      micTestStreamRef.current.getTracks().forEach((track) => track.stop());
      micTestStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // ignore audio context close errors
      }
      audioContextRef.current = null;
    }
  }, []);

  const startMicLoopback = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicTestError("Microphone testing is not supported in this browser.");
      return;
    }

    try {
      await stopMicLoopback();
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(micStream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      micTestStreamRef.current = micStream;
      audioContextRef.current = audioContext;
      micSourceRef.current = source;
      micGainRef.current = gainNode;
      setMicTestError(null);
      setIsMicLoopbackOn(true);
    } catch {
      setMicTestError("Unable to start mic loopback test. Check microphone permissions.");
      await stopMicLoopback();
    }
  }, [stopMicLoopback]);

  const handleToggleMicLoopback = useCallback(() => {
    if (isMicLoopbackOn) {
      void stopMicLoopback();
      return;
    }
    void startMicLoopback();
  }, [isMicLoopbackOn, startMicLoopback, stopMicLoopback]);

  const handleEndSession = useCallback(async () => {
    await stopActiveRecording();

    const askedQuestionCount = questions.length > 0
      ? Math.max(1, Math.min(questions.length, currentQuestion + 1))
      : 0;

    if (askedQuestionCount < MIN_SESSION_QUESTION_COUNT) {
      let voidErrorMessage: string | null = null;

      if (sessionId) {
        const voidResult = await voidInterviewSession({
          sessionId,
          storagePrefix,
        });
        if (voidResult.error) {
          console.error("Failed to fully void interview session:", voidResult.error);
          voidErrorMessage = voidResult.error.message;
        }
      }

      handlePracticeAgain();
      setShowHistoryView(true);
      setRecordingError(
        voidErrorMessage
          ? `Session ended early and attempted to void. Cleanup error: ${voidErrorMessage}`
          : `Session voided. You attempted ${askedQuestionCount} question${askedQuestionCount === 1 ? "" : "s"}; minimum is ${MIN_SESSION_QUESTION_COUNT}.`
      );
      return;
    }

    await completeSession(undefined, "manual");
  }, [completeSession, currentQuestion, handlePracticeAgain, questions.length, sessionId, stopActiveRecording, storagePrefix]);

  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("Camera not supported in this browser.");
      setIsCameraOn(false);
      return null;
    }

    try {
      const requestId = (cameraRequestIdRef.current += 1);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (requestId !== cameraRequestIdRef.current || !desiredCameraOnRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isMicOn;
      });
      setMediaError(null);
      return stream;
    } catch (error) {
      setMediaError("Unable to access camera. Check permissions.");
      setIsCameraOn(false);
      return null;
    }
  }, [isMicOn, stopCamera]);

  const handleToggleCamera = useCallback(() => {
    setIsCameraOn((prev) => {
      const next = !prev;
      desiredCameraOnRef.current = next;
      if (!next) {
        cameraRequestIdRef.current += 1;
        stopCamera();
      } else {
        setMediaError(null);
        if (!streamRef.current) {
          void startCamera();
        }
      }
      return next;
    });
  }, [startCamera, stopCamera]);

  const handleToggleMic = useCallback(() => {
    setIsMicOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isMicOn && isMicLoopbackOn) {
      void stopMicLoopback();
    }
  }, [isMicOn, isMicLoopbackOn, stopMicLoopback]);

  useEffect(() => {
    if (isSessionStarted && isMicLoopbackOn) {
      void stopMicLoopback();
    }
  }, [isSessionStarted, isMicLoopbackOn, stopMicLoopback]);

  useEffect(() => {
    if (!hasStarted || isCompleted || questionsLoading || questions.length > 0) {
      return;
    }
    void fetchQuestions();
  }, [hasStarted, isCompleted, questionsLoading, questions.length, fetchQuestions]);

  useEffect(() => {
    if (!hasStarted || isCompleted || !isCameraOn) {
      stopCamera();
      return;
    }

    if (!streamRef.current) {
      startCamera();
    }

    return () => {
      if (isCompleted) {
        stopCamera();
      }
    };
  }, [hasStarted, isCompleted, isCameraOn, startCamera, stopCamera]);

  useEffect(
    () => () => {
      stopLiveDraftTranscription();
      stopLiveChunkTranscription();
      stopSilenceDetection();
      stopCamera();
      void stopMicLoopback();
    },
    [stopCamera, stopLiveChunkTranscription, stopLiveDraftTranscription, stopMicLoopback, stopSilenceDetection]
  );

  useEffect(() => {
    if (!useLiveChunkFallback || !isSessionStarted || isPaused || !isMicOn) {
      stopLiveChunkTranscription();
      return;
    }

    startLiveChunkTranscription();
  }, [
    isMicOn,
    isPaused,
    isSessionStarted,
    startLiveChunkTranscription,
    stopLiveChunkTranscription,
    useLiveChunkFallback,
  ]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-600">
        Loading mock interview...
      </div>
    );
  }

  if (!hasStarted) {
    if (showHistoryView) {
      const completedSessions = historySessions.filter((session) => session.status === "completed").length;
      const sessionsWithScore = historySessions.filter((session) => typeof session.score === "number");
      const averageScore =
        sessionsWithScore.length > 0
          ? sessionsWithScore.reduce((sum, session) => sum + (session.score || 0), 0) / sessionsWithScore.length
          : null;

      return (
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar (desktop) */}
          <div className="hidden md:block flex-shrink-0">
            <Sidebar
              userName={userName}
              userID={userID}
              onLogout={onLogout}
              onNavigate={onNavigate}
              activeNav="student/interview"
            />
          </div>

          {/* Mobile sidebar overlay */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
              <div className="relative h-full">
                <div className="absolute left-0 top-0 bottom-0">
                  <Sidebar
                    userName={userName}
                    userID={userID}
                    onLogout={() => { setMobileOpen(false); onLogout(); }}
                    onNavigate={(r) => { setMobileOpen(false); onNavigate(r); }}
                    activeNav="student/interview"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Close sidebar"
                  className="absolute top-4 right-4 p-2 rounded-md bg-white/90"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="w-5 h-5 text-gray-800" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile top bar with hamburger */}
            <div className="md:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 sticky top-0 z-10">
              <button
                type="button"
                aria-label="Open sidebar"
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-8">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Mock Interview Sessions</h1>
                <p className="text-gray-500 mt-1">Review your past interview attempts and scores.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">{historySessions.length}</div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">{completedSessions}</div>
                  <div className="text-sm text-gray-600">Completed Sessions</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                  <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">
                    {averageScore !== null ? averageScore.toFixed(2) : "—"}
                  </div>
                  <div className="text-sm text-gray-600">Average Score (1-5)</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Past Sessions</h3>
                  <button
                    type="button"
                    onClick={() => setShowHistoryView(false)}
                    className="bg-[#1B2744] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#131d33] transition-colors"
                  >
                    Take Mock Interview
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[620px] w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Questions</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Score</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyLoading ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                            Loading sessions...
                          </td>
                        </tr>
                      ) : historySessions.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                            No interview sessions yet.
                          </td>
                        </tr>
                      ) : (
                        historySessions.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700">
                              {new Date(session.startedAt || session.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-gray-700 capitalize">{session.status.replace("_", " ")}</td>
                            <td className="px-4 py-3 text-gray-700">{session.totalQuestions || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">
                              {typeof session.score === "number" ? `${session.score.toFixed(2)} / 5` : "Not available"}
                              {session.evaluatedCount !== null ? (
                                <span className="text-xs text-gray-500 ml-2">({session.evaluatedCount} answers)</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewHistorySession(session)}
                                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-700 hover:text-cyan-900 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 transition-colors"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportHistorySession(session)}
                                  disabled={exportingHistoryId === session.id}
                                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                  {exportingHistoryId === session.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  Export
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Session Details Modal */}
          {selectedHistorySession && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50">
              <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedHistorySession.startedAt
                        ? new Date(selectedHistorySession.startedAt).toLocaleString()
                        : new Date(selectedHistorySession.createdAt).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 capitalize">
                        {selectedHistorySession.status.replace("_", " ")}
                      </span>
                      {selectedHistorySession.totalQuestions != null && (
                        <span className="text-xs text-gray-400">
                          {selectedHistorySession.totalQuestions} question{selectedHistorySession.totalQuestions !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close dialog"
                    onClick={() => setSelectedHistorySession(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto">
                  {loadingHistorySegments ? (
                    <div className="text-center py-16 text-gray-400">
                      <Loader2 className="w-8 h-8 mx-auto mb-3 opacity-40 animate-spin" />
                      <p>Loading questions and evaluations…</p>
                      <p className="text-xs mt-1 text-gray-300">This may take a moment</p>
                    </div>
                  ) : Object.keys(historySegmentsByQuestion).length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Video className="w-8 h-8 mx-auto mb-3 opacity-40" />
                      <p>No recorded segments for this session.</p>
                    </div>
                  ) : (
                    Object.keys(historySegmentsByQuestion)
                      .sort((a, b) => Number(a) - Number(b))
                      .map((qIdx) => (
                        <SessionQuestionCard
                          key={qIdx}
                          qIdx={qIdx}
                          segments={historySegmentsByQuestion[qIdx]}
                          loadingVideos={loadingHistoryVideos}
                        />
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar (desktop) */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar
            userName={userName}
            userID={userID}
            onLogout={onLogout}
            onNavigate={onNavigate}
            activeNav="student/interview"
          />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full">
              <div className="absolute left-0 top-0 bottom-0">
                <Sidebar
                  userName={userName}
                  userID={userID}
                  onLogout={() => { setMobileOpen(false); onLogout(); }}
                  onNavigate={(r) => { setMobileOpen(false); onNavigate(r); }}
                  activeNav="student/interview"
                />
              </div>
              <button
                type="button"
                aria-label="Close sidebar"
                className="absolute top-4 right-4 p-2 rounded-md bg-white/90"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-5 h-5 text-gray-800" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar with hamburger */}
          <div className="md:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 sticky top-0 z-10">
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex-1 overflow-auto lg:overflow-hidden">
          {/* Content Area */}
          <div className="px-4 sm:px-6 lg:px-8 py-3 lg:h-full lg:flex lg:flex-col">
            {/* Back button */}
            <div className="mb-1.5">
              <button
                type="button"
                onClick={handleBackToDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sessions
              </button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 max-w-3xl w-full mx-auto lg:flex-1 flex flex-col">
              {/* Card Header */}
              <div className="text-center mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Bot className="w-5 h-5 text-cyan-700" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    AI Mock Interview
                  </h1>
                  <span className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI-Powered
                  </span>
                </div>
                <p className="text-gray-500 text-sm">
                  Practice your interview skills with AI-evaluated feedback
                </p>
              </div>

              {/* Ready to Practice label */}
              <p className="text-base font-semibold text-gray-800 mb-3">
                Ready to Practice?
              </p>

              {/* Browser/transcription compatibility warning */}
              {(!isSpeechRecognitionSupported() || isBraveBrowser()) && (
                <div className="mb-3 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-xs">Live transcription not supported in this browser</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      {isBraveBrowser()
                        ? "Brave browser blocks the microphone API needed for live transcription. Please use Chrome or Edge for the best experience."
                        : "Your browser does not support live transcription. Please use Chrome or Edge for the best experience."}
                    </p>
                  </div>
                </div>
              )}

              {/* Checklist + Privacy side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 lg:flex-1">
                {/* Checklist */}
                <div className="bg-cyan-50 rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                    Before You Start
                  </h3>
                  <ul className="space-y-1.5">
                    <ChecklistItem text="Allow microphone and camera access when prompted" />
                    <ChecklistItem text="Find a quiet environment" />
                    <ChecklistItem text="Respond in English for accurate transcription" />
                    <ChecklistItem text="Speak clearly and at a moderate pace" />
                  </ul>
                </div>

                {/* Data Privacy Notice */}
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <h3 className="font-semibold text-amber-900 text-sm">
                      Data Privacy Notice
                    </h3>
                  </div>
                  <ul className="space-y-1 text-amber-800 text-xs leading-relaxed">
                    <li>• Your <strong>video, audio, and transcriptions</strong> will be recorded and stored on secure university servers.</li>
                    <li>• Accessible to authorized <strong>Career Services staff</strong> for review and improvement.</li>
                    <li>• Used solely for <strong>career development</strong> per the university's data privacy policy.</li>
                    <li>• Request data deletion by contacting the Career Services office.</li>
                  </ul>
                  <p className="mt-2 text-xs text-amber-700 font-medium border-t border-amber-200 pt-2">
                    By clicking "Start", you consent to the above.
                  </p>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => {
                  const nextState = {
                    hasStarted: true,
                    isSessionStarted: false,
                    isCompleted: false,
                    currentQuestion,
                    isCameraOn: true,
                    isMicOn,
                    sessionId: null,
                    storagePrefix: null,
                    savedSegmentCount: 0,
                    questions,
                    bankQuestionPool,
                    followupCountByBase,
                  };
                  if (stateKey) {
                    try {
                      const serialized = JSON.stringify(nextState);
                      localStorage.setItem(stateKey, serialized);
                      sessionStorage.setItem(SESSION_BACKUP_KEY, serialized);
                      sessionStorage.setItem(ACTIVE_KEY_STORAGE, stateKey);
                    } catch (error) {
                      console.error("Failed to persist mock interview state:", error);
                    }
                  }
                  setHasStarted(true);
                  setSessionId(null);
                  setStoragePrefix(null);
                  setSavedSegmentCount(0);
                  setIsCameraOn(true);
                  setMediaError(null);
                }}
                className="w-full bg-[#1B2744] text-white py-3.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                Start Mock Interview
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // Interview Completion Screen
  if (isCompleted) {
    const sessionStats = computeSessionSTARStats();
    const overallPercent = Math.max(0, Math.min(100, (sessionStats.overallAverage / 5) * 100));
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar (desktop) */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar
            userName={userName}
            userID={userID}
            onLogout={onLogout}
            onNavigate={onNavigate}
            activeNav="student/interview"
          />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full">
              <div className="absolute left-0 top-0 bottom-0">
                <Sidebar
                  userName={userName}
                  userID={userID}
                  onLogout={() => { setMobileOpen(false); onLogout(); }}
                  onNavigate={(r) => { setMobileOpen(false); onNavigate(r); }}
                  activeNav="student/interview"
                />
              </div>
              <button
                type="button"
                aria-label="Close sidebar"
                className="absolute top-4 right-4 p-2 rounded-md bg-white/90"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-5 h-5 text-gray-800" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar with hamburger */}
          <div className="md:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 sticky top-0 z-10">
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
          {/* Content Area */}
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Completion Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-8 lg:p-12 shadow-sm border border-gray-100 max-w-2xl mx-auto">
              {/* Success Icon */}
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-600" />
              </div>

              {/* Heading */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-2">
                Interview Complete!
              </h1>
              <p className="text-gray-500 text-center mb-8">
                Your interview has been submitted successfully.
              </p>

              {/* Overall Score Card */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="#1B2744"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(overallPercent / 100) * 339.29} 339.29`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{sessionStats.overallAverage.toFixed(2)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Overall Score</p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {sessionStats.overallAverage.toFixed(2)} / 5 ({sessionStats.evaluatedCount} answers)
                  </h2>
                  {(() => {
                    const avg = sessionStats.overallAverage;
                    let label = "";
                    let colorClass = "";
                    if (avg >= 4.5) { label = "Excellent"; colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200"; }
                    else if (avg >= 3.5) { label = "Very Good"; colorClass = "text-blue-700 bg-blue-50 border-blue-200"; }
                    else if (avg >= 2.5) { label = "Good"; colorClass = "text-indigo-700 bg-indigo-50 border-indigo-200"; }
                    else if (avg >= 1.5) { label = "Fair"; colorClass = "text-amber-700 bg-amber-50 border-amber-200"; }
                    else { label = "Needs Improvement"; colorClass = "text-red-700 bg-red-50 border-red-200"; }
                    return (
                      <span className={`inline-block mt-2 px-3 py-1 text-sm font-semibold rounded-full border ${colorClass}`}>
                        {label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Evaluation Metrics (STAR method) */}
              <div className="mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Evaluation Metrics (STAR)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <MetricCard
                    label="Situation clarity"
                    percentage={Math.round((sessionStats.situation / 5) * 100)}
                    score={sessionStats.situation}
                    feedbacks={{
                      5: "Clearly and fully describes the situation with all relevant details.",
                      4: "Describes the situation well with only minor missing details.",
                      3: "Situation is somewhat clear but lacks specifics.",
                      2: "Situation is vague or partially unclear.",
                      1: "Situation is missing, unclear, or confusing.",
                    }}
                  />
                  <MetricCard
                    label="Task ownership"
                    percentage={Math.round((sessionStats.task / 5) * 100)}
                    score={sessionStats.task}
                    feedbacks={{
                      5: "Clearly defines the challenge or responsibility with precision and ownership.",
                      4: "Defines the task well but could be more specific.",
                      3: "Task is somewhat clear but lacks specifics.",
                      2: "Task is vague or lacks relevance.",
                      1: "Task is missing or unclear.",
                    }}
                  />
                  <MetricCard
                    label="Action specificity"
                    percentage={Math.round((sessionStats.action / 5) * 100)}
                    score={sessionStats.action}
                    feedbacks={{
                      5: "Provides detailed, relevant actions; demonstrates initiative and skills.",
                      4: "Actions are clear and mostly relevant.",
                      3: "Actions are mentioned but generic or partially relevant.",
                      2: "Actions are vague or minimally relevant.",
                      1: "Actions are missing or irrelevant.",
                    }}
                  />
                  <MetricCard
                    label="Result measurability"
                    percentage={Math.round((sessionStats.result / 5) * 100)}
                    score={sessionStats.result}
                    feedbacks={{
                      5: "Clearly explains measurable outcomes and meaningful impact.",
                      4: "Result is explained with some specifics and positive impact.",
                      3: "Result is mentioned but vague or minimal.",
                      2: "Result is unclear or only partially connected to actions.",
                      1: "Result is missing, unclear, or disorganized.",
                    }}
                  />
                  <MetricCard
                    label="Reflection & learning"
                    percentage={Math.round((sessionStats.reflection / 5) * 100)}
                    score={sessionStats.reflection}
                    feedbacks={{
                      5: "Applicant reflects meaningfully on lessons learned and demonstrates professional growth.",
                      4: "Some reflection provided; response is organized and professional.",
                      3: "Limited reflection; some structure but not fully developed.",
                      2: "No reflection or learning insight; response lacks organization.",
                      1: "No reflection provided; response is disorganized or off-topic.",
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportSummary}
                  className="flex-1 border-2 border-[#1B2744] text-[#1B2744] py-3.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Download Summary
                </button>
                <button
                  onClick={handlePracticeAgain}
                  className="flex-1 bg-[#1B2744] text-white py-3.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors"
                >
                  Practice Again
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  const askedQuestionCountForUi =
    isSessionStarted && questions.length > 0
      ? Math.max(1, Math.min(questions.length, currentQuestion + 1))
      : 0;
  const remainingQuestionsForCount = Math.max(
    MIN_SESSION_QUESTION_COUNT - askedQuestionCountForUi,
    0
  );
  const hasMetMinimumQuestionRequirement = remainingQuestionsForCount === 0;
  const runningAverage = calculateSessionStarAverage();
  const evaluatedCountForUi = Object.keys(evaluations || {}).length;

  // Interview Recording Screen
  return (
    <>
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/interview"
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <div className="absolute left-0 top-0 bottom-0">
              <Sidebar
                userName={userName}
                userID={userID}
                onLogout={() => { setMobileOpen(false); onLogout(); }}
                onNavigate={(r) => { setMobileOpen(false); onNavigate(r); }}
                activeNav="student/interview"
              />
            </div>
            <button
              aria-label="Close sidebar"
              className="absolute top-4 right-4 p-2 rounded-md bg-white/90"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 sticky top-0 z-10">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        {/* Recording Interface */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-6 p-3 sm:p-4 lg:p-6 overflow-y-auto relative">

          {/* Mobile sticky question pill - lg:hidden */}
          {isSessionStarted && (
            <div className="lg:hidden sticky top-0 z-20 -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 px-3 sm:px-4 pt-3 sm:pt-4 pb-2 bg-gray-50/95 backdrop-blur-sm shadow-sm">
              {/* Question counter + progress bar */}
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-xs text-gray-500 font-medium">Question {askedQuestionCountForUi} of {MAX_SESSION_QUESTION_COUNT}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mb-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (askedQuestionCountForUi / MAX_SESSION_QUESTION_COUNT) * 100)}%` }}
                />
              </div>
              {/* Question pill toggle */}
              <button
                type="button"
                onClick={() => setQuestionPillExpanded(v => !v)}
                className={`w-full text-left rounded-xl px-4 py-2.5 flex items-start gap-2.5 shadow-sm border transition-all duration-500 ${
                  questionHighlighted
                    ? "bg-cyan-500 border-cyan-400 text-white"
                    : "bg-gray-900 border-gray-700 text-white"
                }`}
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${questionHighlighted ? "bg-white/20" : "bg-cyan-500"}`}>
                  Q{askedQuestionCountForUi}
                </span>
                <span className="text-sm font-medium flex-1 leading-snug">
                  {questionPillExpanded
                    ? questions[currentQuestion]?.question || "Loading question..."
                    : `${(questions[currentQuestion]?.question || "Loading question...").slice(0, 45)}${(questions[currentQuestion]?.question || "").length > 45 ? "..." : ""}`
                  }
                </span>
                {questionPillExpanded
                  ? <ChevronUp className="w-4 h-4 flex-shrink-0 opacity-60 mt-0.5" />
                  : <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-60 mt-0.5" />
                }
              </button>
            </div>
          )}

          {/* Mobile toast notifications - fixed overlay, lg:hidden */}
          {isSessionStarted && (
            <div className="lg:hidden fixed top-16 left-3 right-3 z-50 flex flex-col gap-2 pointer-events-none">
              <div className={`pointer-events-auto transition-all duration-300 ${showTipToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 shadow-lg flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">💡</span>
                  <p className="text-xs text-yellow-800 flex-1">{questions[currentQuestion]?.tip || ""}</p>
                  <button type="button" title="Dismiss" onClick={() => { tipToastDismissed.current = true; setShowTipToast(false); }} className="flex-shrink-0 text-yellow-400 hover:text-yellow-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className={`pointer-events-auto transition-all duration-300 ${showSessionToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                <div className={`rounded-xl px-3 py-2.5 shadow-lg border flex items-start gap-2 ${hasMetMinimumQuestionRequirement ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${hasMetMinimumQuestionRequirement ? "text-emerald-600" : "text-amber-600"}`} />
                  <p className={`text-xs flex-1 ${hasMetMinimumQuestionRequirement ? "text-emerald-800" : "text-amber-900"}`}>
                    {hasMetMinimumQuestionRequirement
                      ? `Minimum met: ${askedQuestionCountForUi}/${MIN_SESSION_QUESTION_COUNT} questions completed.`
                      : `${askedQuestionCountForUi}/${MIN_SESSION_QUESTION_COUNT} done — answer ${remainingQuestionsForCount} more or session will be voided.`}
                  </p>
                  <button type="button" title="Dismiss" onClick={() => { sessionToastDismissed.current = true; setShowSessionToast(false); }} className={`flex-shrink-0 ${hasMetMinimumQuestionRequirement ? "text-emerald-400 hover:text-emerald-600" : "text-amber-400 hover:text-amber-600"}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className={`pointer-events-auto transition-all duration-300 ${showInstructionToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-3 py-2.5 shadow-lg flex items-start gap-2">
                  <p className="text-xs text-cyan-800 flex-1">Click <strong>Next Question</strong> to finalize your answer. When the done badge appears, you can restart or move on.</p>
                  <button type="button" title="Dismiss" onClick={() => { instructionToastDismissed.current = true; setShowInstructionToast(false); }} className="flex-shrink-0 text-cyan-400 hover:text-cyan-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Left - Camera Preview */}
          <div className="flex flex-col lg:flex-1 lg:min-h-0">
            {/* Recording Status and Controls */}
            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col p-3 sm:p-4 relative shadow-sm lg:flex-1 lg:min-h-0">
              {/* Recording Badges */}
              {isSessionStarted && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div
                    className={
                      isPauseTranscriptPending
                        ? "inline-flex items-center gap-2 bg-amber-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm"
                        : isPaused
                        ? "inline-flex items-center gap-2 bg-emerald-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm"
                        : "inline-flex items-center gap-2 bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm"
                    }
                  >
                    <span
                      className={
                        isPauseTranscriptPending
                          ? "w-2 h-2 bg-white rounded-full animate-pulse"
                          : isPaused
                          ? "w-2 h-2 bg-white rounded-full"
                          : "w-2 h-2 bg-white rounded-full animate-pulse"
                      }
                    />
                    {isPauseTranscriptPending ? "Processing" : isPaused ? "Ready" : "Recording"}
                  </div>
                  {isPaused &&
                    preparedNextAction &&
                    !isAdvancingNextQuestion &&
                    !isDecidingNextQuestion &&
                    !isPauseTranscriptPending && (
                      <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Done
                      </div>
                    )}
                </div>
              )}

              {/* Camera Preview */}
              <div className="w-full flex items-center justify-center relative max-h-[240px] sm:max-h-none sm:flex-1 sm:min-h-0">
                {isCameraOn && !mediaError ? (
                  <div className="w-full h-full min-h-[200px] max-h-[240px] sm:max-h-none sm:min-h-[340px] rounded-xl overflow-hidden bg-black shadow-inner relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Floating preview tip */}
                    {!isSessionStarted && showPreviewTip && (
                      <div className="absolute top-2 right-2 left-2 sm:left-auto sm:max-w-[220px] bg-black/70 text-white rounded-lg px-3 py-2 text-xs leading-snug backdrop-blur-sm flex items-start gap-2">
                        <span className="flex-1">💡 Test your camera & mic, then click <strong>Start Session</strong>.</span>
                        <button
                          onClick={() => setShowPreviewTip(false)}
                          className="flex-shrink-0 opacity-70 hover:opacity-100 mt-0.5"
                          aria-label="Close tip"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Countdown overlay */}
                    {recordingCountdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                        <div className="text-white text-7xl font-bold drop-shadow-lg select-none">
                          {recordingCountdown}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[200px] max-h-[240px] sm:max-h-none sm:min-h-[340px] rounded-xl bg-gray-100 flex flex-col items-center justify-center relative">
                    <div className="w-28 h-28 bg-gray-300 rounded-full flex items-center justify-center mb-4">
                      <Camera className="w-14 h-14 text-gray-600" />
                    </div>
                    <p className="text-gray-600 font-medium">Camera Preview</p>
                    {mediaError && (
                      <div className="mt-3 mx-4 bg-red-50 border border-red-300 rounded-lg px-4 py-3 flex items-start gap-2 max-w-sm">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 font-medium">{mediaError}</p>
                      </div>
                    )}
                    {/* Floating preview tip (camera off state) */}
                    {!isSessionStarted && showPreviewTip && (
                      <div className="absolute top-2 right-2 left-2 sm:left-auto sm:max-w-[220px] bg-gray-800/85 text-white rounded-lg px-3 py-2 text-xs leading-snug flex items-start gap-2">
                        <span className="flex-1">💡 Test your camera & mic, then click <strong>Start Session</strong>.</span>
                        <button
                          onClick={() => setShowPreviewTip(false)}
                          className="flex-shrink-0 opacity-70 hover:opacity-100 mt-0.5"
                          aria-label="Close tip"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls Dropdown */}
              <div className="mt-3 w-full flex flex-col gap-2">
                {/* Controls Panel - Always visible on desktop, toggle on mobile */}
                <div className={controlsOpen ? "" : "hidden md:block"}>
                  <div className="w-full grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3 bg-white rounded-xl sm:rounded-2xl px-2 sm:px-4 py-2.5 sm:py-3 shadow-md border border-gray-200 animate-in fade-in duration-200">
                    {/* Mic */}
                    <button
                      onClick={handleToggleMic}
                      className={
                        isMicOn
                          ? "col-span-1 group inline-flex w-full sm:flex-1 sm:min-w-[140px] items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                          : "col-span-1 group inline-flex w-full sm:flex-1 sm:min-w-[140px] items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      }
                      title={isMicOn ? "Mute mic" : "Unmute mic"}
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/80 border border-current/20">
                        {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold">{isMicOn ? "Mic On" : "Mic Off"}</span>
                    </button>
                    {/* Camera */}
                    <button
                      onClick={handleToggleCamera}
                      className={
                        isCameraOn
                          ? "col-span-1 group inline-flex w-full sm:flex-1 sm:min-w-[140px] items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition-colors"
                          : "col-span-1 group inline-flex w-full sm:flex-1 sm:min-w-[140px] items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      }
                      title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/80 border border-current/20">
                        {isCameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold">{isCameraOn ? "Cam On" : "Cam Off"}</span>
                    </button>
                    {/* Mic Test - full width on mobile */}
                    <button
                      onClick={handleToggleMicLoopback}
                      disabled={!isMicOn || isSessionStarted}
                      className={
                        !isMicOn || isSessionStarted
                          ? "col-span-2 sm:col-span-1 inline-flex w-full justify-center items-center gap-1.5 px-2.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed sm:flex-1 sm:min-w-[140px]"
                          : isMicLoopbackOn
                          ? "col-span-2 sm:col-span-1 inline-flex w-full justify-center items-center gap-1.5 px-2.5 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors sm:flex-1 sm:min-w-[140px]"
                          : "col-span-2 sm:col-span-1 inline-flex w-full justify-center items-center gap-1.5 px-2.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors sm:flex-1 sm:min-w-[140px]"
                      }
                      title={
                        isSessionStarted
                          ? "Mic loopback is available only before session start"
                          : isMicLoopbackOn
                          ? "Stop mic loopback test"
                          : "Start mic loopback test"
                      }
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs sm:text-sm font-semibold">
                        {isMicLoopbackOn ? "Stop Mic Test" : "Mic Test"}
                      </span>
                    </button>
                    {/* Start/Next - full width on mobile, flex-1 on desktop */}
                    <button
                      disabled={
                        isUploadingSegment ||
                        isDecidingNextQuestion ||
                        isAdvancingNextQuestion ||
                        (isSessionStarted && isPauseTranscriptPending && !(liveDraftTranscript || "").trim())
                      }
                      className="col-span-2 sm:col-span-1 w-full justify-center bg-[#1B2744] text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors flex items-center gap-1.5 sm:flex-1 sm:min-w-[160px]"
                      onClick={async () => {
                        if (!isSessionStarted) {
                          let questionSet = questions;
                          if (questionSet.length === 0) {
                            questionSet = await fetchQuestions();
                          }
                          if (questionSet.length === 0) {
                            return;
                          }

                          const activeStream = streamRef.current || (await startCamera());
                          if (!activeStream) {
                            setRecordingError("Camera/microphone stream is required before starting session.");
                            return;
                          }

                          const sessionResult = await startInterviewSession({
                            userId,
                            userEmail: email,
                            userName,
                            totalQuestions: MAX_SESSION_QUESTION_COUNT,
                            metadata: {
                              mode: "mock_interview",
                              min_questions: MIN_SESSION_QUESTION_COUNT,
                              max_questions: MAX_SESSION_QUESTION_COUNT,
                              star_average_target: STAR_AVERAGE_TARGET_SCORE,
                            },
                          });
                          if (sessionResult.error || !sessionResult.data?.id) {
                            setRecordingError("Unable to start interview session in database.");
                            return;
                          }

                          setSessionId(sessionResult.data.id);
                          activeSessionIdRef.current = sessionResult.data.id;
                          setStoragePrefix(sessionResult.data.storage_prefix);
                          activeQuestionIndexRef.current = 0;
                          setFullSessionTranscript("");
                          fullSessionTranscriptRef.current = "";
                          setLiveTranscriptText(null);
                          setLatestWhisperStatus(null);
                          setIsPauseTranscriptPending(false);
                          setLiveDraftTranscript("");
                          segmentOrderRef.current = 1;
                          setFollowupCountByBase({});
                          setIsDecidingNextQuestion(false);
                          setIsAdvancingNextQuestion(false);
                          setPreparedNextAction(null);
                          setIsSessionStarted(true);
                          setIsPaused(false);
                          setCurrentQuestion(0);
                          // Clear any evaluation results from the previous session
                          setEvaluations({});
                          lastEvaluatedTranscriptRef.current = {};
                          try { if (stateKey) localStorage.removeItem(`${stateKey}_evaluations`); } catch {}
                          await startSegmentRecording(0, {
                            sessionId: sessionResult.data.id,
                            storagePrefix: sessionResult.data.storage_prefix,
                          }, questionSet[0]);
                          return;
                        }
                        // Require an intermediate confirmation when a prepared next action exists
                        if (isSessionStarted && preparedNextAction && !isNextConfirmed) {
                          setIsNextConfirmed(true);
                          return;
                        }
                        await handleNextQuestion();
                      }}
                      title={
                        isSessionStarted && isAdvancingNextQuestion
                          ? "Preparing your current answer"
                          : isSessionStarted && isDecidingNextQuestion
                          ? "Deciding the next step"
                          : isSessionStarted && preparedNextAction
                          ? "Ready. Click again to continue, or use Restart Answer to retry this answer."
                          : isSessionStarted && isPauseTranscriptPending && (liveDraftTranscript || "").trim()
                          ? "Draft transcript is ready. You can continue while final transcription finishes in the background."
                          : isSessionStarted && isPauseTranscriptPending
                          ? "Waiting for transcription to finish"
                          : isSessionStarted && !isPaused
                          ? "Capture and finalize this answer now."
                          : isSessionStarted
                          ? "Go to next question"
                          : "Start session"
                      }
                    >
                      <span className="sm:hidden">
                        {questionsLoading
                          ? "Loading"
                          : isAdvancingNextQuestion && !isDecidingNextQuestion
                          ? "Preparing"
                          : isUploadingSegment
                          ? "Saving"
                          : isDecidingNextQuestion
                          ? "Deciding"
                          : isSessionStarted && preparedNextAction
                          ? isNextConfirmed
                            ? "Next"
                            : "Confirm"
                          : isSessionStarted
                          ? (isPaused ? "Next" : "Submit")
                          : "Start"}
                      </span>
                      <span className="hidden sm:inline">
                      {questionsLoading
                        ? "Loading Questions..."
                        : isAdvancingNextQuestion && !isDecidingNextQuestion
                        ? "Preparing Now..."
                        : isUploadingSegment
                        ? "Saving Segment..."
                        : isDecidingNextQuestion
                        ? "Deciding Now..."
                        : isSessionStarted && preparedNextAction
                        ? isNextConfirmed
                          ? "Next Question"
                          : "Confirm"
                        : isSessionStarted
                        ? (isPaused ? "Next Question" : "Submit Answer")
                        : "Start Session"}
                      </span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    {/* Restart - col-span-1 on mobile */}
                    <button
                      onClick={handleRestartCurrentAnswer}
                      disabled={!isSessionStarted || !isPaused || isPauseTranscriptPending || isUploadingSegment || isDecidingNextQuestion || isAdvancingNextQuestion}
                      className={
                        !isSessionStarted || !isPaused || isPauseTranscriptPending || isUploadingSegment || isDecidingNextQuestion || isAdvancingNextQuestion
                          ? "col-span-1 w-full justify-center px-2.5 py-2 rounded-lg font-semibold bg-gray-200 text-gray-400 cursor-not-allowed flex items-center gap-1.5 sm:flex-1 sm:min-w-[150px]"
                          : "col-span-1 w-full justify-center px-2.5 py-2 rounded-lg font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-1.5 sm:flex-1 sm:min-w-[150px]"
                      }
                      title={
                        !isSessionStarted
                          ? "Start session first"
                          : !isPaused
                          ? "Wait until your answer is auto-captured"
                          : isPauseTranscriptPending
                          ? "Wait for transcript processing to complete"
                          : "Restart this question answer"
                      }
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="sm:hidden">Restart</span>
                      <span className="hidden sm:inline">Restart Answer</span>
                    </button>
                    {/* End Session - col-span-1 on mobile */}
                    <button
                      onClick={handleEndSession}
                      disabled={!isSessionStarted || isAdvancingNextQuestion}
                      className={
                        !isSessionStarted || isAdvancingNextQuestion
                          ? "col-span-1 w-full justify-center px-2.5 py-2 rounded-lg font-semibold bg-gray-200 text-gray-400 cursor-not-allowed flex items-center gap-1.5 sm:flex-1 sm:min-w-[150px]"
                          : "col-span-1 w-full justify-center px-2.5 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 sm:flex-1 sm:min-w-[150px]"
                      }
                      title={
                        !isSessionStarted
                          ? "Start session first"
                          : remainingQuestionsForCount > 0
                          ? `Ending now will void this session. Complete ${remainingQuestionsForCount} more question${remainingQuestionsForCount === 1 ? "" : "s"} to count it.`
                          : "End session"
                      }
                    >
                      <Square className="w-4 h-4" />
                      <span className="sm:hidden">End</span>
                      <span className="hidden sm:inline">End Session</span>
                    </button>
                  </div>
                </div>
                {/* Toggle Button - Mobile only, placed BELOW panel so it stays in view */}
                <button
                  onClick={() => setControlsOpen(!controlsOpen)}
                  className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors border border-gray-300"
                >
                  {controlsOpen ? "Hide Controls" : "Show Controls"}
                  {controlsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              {(micTestError || isMicLoopbackOn) && (
                <p className="text-xs text-center mt-3 text-gray-700">
                  {micTestError || "Mic loopback test is active. Use earphones to avoid feedback."}
                </p>
              )}
              {(recordingError || isUploadingSegment) && (
                <div className={`mt-2 px-3 py-2 rounded-lg text-xs text-center font-medium border ${
                  recordingError && (recordingError.toLowerCase().includes('required') || recordingError.toLowerCase().includes('muted') || recordingError.toLowerCase().includes('not ready') || recordingError.toLowerCase().includes('permission'))
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                  {recordingError || "Uploading recorded segment..."}
                </div>
              )}
            </div>
          </div>

          {/* Right - Question and Transcription */}
          <div className="flex flex-col w-full lg:w-96 gap-3 sm:gap-5 lg:overflow-y-auto">
            {/* Question Card - only shown during active session, hidden on mobile (pill handles it) */}
            {isSessionStarted && (
            <div className={`hidden lg:block rounded-2xl p-4 sm:p-5 shadow-sm border transition-all duration-500 ${questionHighlighted ? "bg-cyan-50 border-cyan-400 ring-2 ring-cyan-200 scale-[1.01]" : "bg-white border-gray-100"}`}>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 font-medium">Question {askedQuestionCountForUi} of {MAX_SESSION_QUESTION_COUNT}</span>
                  {questionHighlighted && (
                    <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">New Question</span>
                  )}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  {/* eslint-disable-next-line react/forbid-component-props */}
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (askedQuestionCountForUi / MAX_SESSION_QUESTION_COUNT) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-cyan-600 text-sm font-semibold uppercase">
                  {questions[currentQuestion]?.type || "Question"}
                </p>
                {questions[currentQuestion]?.type === "AI Generated" && questions[currentQuestion]?.id && !questions[currentQuestion].id.startsWith("ai-") && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 mr-1">Rate this question:</span>
                    <button
                      type="button"
                      onClick={() => handleRateQuestion(questions[currentQuestion].id, "good")}
                      className={`text-lg px-1 rounded transition-opacity ${questionRatings[questions[currentQuestion].id] === "good" ? "opacity-100" : "opacity-40 hover:opacity-80"}`}
                      title="Good question"
                    >👍</button>
                    <button
                      type="button"
                      onClick={() => handleRateQuestion(questions[currentQuestion].id, "bad")}
                      className={`text-lg px-1 rounded transition-opacity ${questionRatings[questions[currentQuestion].id] === "bad" ? "opacity-100" : "opacity-40 hover:opacity-80"}`}
                      title="Bad question"
                    >👎</button>
                  </div>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 leading-snug">
                {questions[currentQuestion]?.question || "Loading question..."}
              </h3>
              <div className="hidden lg:block bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>{questions[currentQuestion]?.tip || "Please wait while we fetch your question."}</span>
                </p>
              </div>
              <div
                className={
                  hasMetMinimumQuestionRequirement
                    ? "hidden lg:block mt-2.5 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5"
                    : "hidden lg:block mt-2.5 bg-amber-50 border border-amber-200 rounded-lg p-2.5"
                }
              >
                <p
                  className={
                    hasMetMinimumQuestionRequirement
                      ? "text-xs text-emerald-800 flex items-start gap-2"
                      : "text-xs text-amber-900 flex items-start gap-2"
                  }
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {hasMetMinimumQuestionRequirement
                      ? `Minimum requirement met: ${askedQuestionCountForUi}/${MIN_SESSION_QUESTION_COUNT} questions completed. This session will count if you end now.`
                      : `Session count requirement: ${askedQuestionCountForUi}/${MIN_SESSION_QUESTION_COUNT} questions completed. Answer ${remainingQuestionsForCount} more before ending, otherwise this session will be voided.`}
                  </span>
                </p>
              </div>
              {currentQuestion > 0 && (evaluations as Record<number, any>)[currentQuestion - 1]?.score != null && (
                <div className="mt-2.5 bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                  <p className="text-xs text-purple-800 flex items-center justify-between">
                    <span>Previous answer score</span>
                    <span className="font-bold">{Number((evaluations as Record<number, any>)[currentQuestion - 1].score).toFixed(1)} / 5</span>
                  </p>
                  {(evaluations as Record<number, any>)[currentQuestion - 1]?.feedback && (
                    <p className="text-xs text-purple-700 mt-1">{(evaluations as Record<number, any>)[currentQuestion - 1].feedback}</p>
                  )}
                </div>
              )}
              {evaluatedCountForUi > 0 && (
                <div
                  className={
                    runningAverage >= STAR_AVERAGE_TARGET_SCORE
                      ? "mt-2.5 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5"
                      : "mt-2.5 bg-indigo-50 border border-indigo-200 rounded-lg p-2.5"
                  }
                >
                  <p
                    className={
                      runningAverage >= STAR_AVERAGE_TARGET_SCORE
                        ? "text-xs text-emerald-800 flex items-center justify-between"
                        : "text-xs text-indigo-800 flex items-center justify-between"
                    }
                  >
                    <span>
                      {runningAverage >= STAR_AVERAGE_TARGET_SCORE
                        ? `Score target reached! Avg: ${runningAverage.toFixed(2)} / 5`
                        : `Running avg: ${runningAverage.toFixed(2)} / 5 — need ${STAR_AVERAGE_TARGET_SCORE.toFixed(1)} to finish early`}
                    </span>
                    <span className="ml-2 font-semibold whitespace-nowrap">
                      {evaluatedCountForUi} scored
                    </span>
                  </p>
                </div>
              )}
              <div className="hidden lg:block mt-2.5 bg-cyan-50 border border-cyan-200 rounded-lg p-2.5">
                <p className="text-xs text-cyan-800">
                  Click Next Question to finalize this answer. When the done badge appears, you can either Restart Answer or click Next Question again to continue.
                </p>
              </div>
              {questionsError && (
                <p className="text-sm text-red-600 mt-3">{questionsError}</p>
              )}
            </div>
            )}

            {/* Live Transcription */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 flex-1 flex flex-col min-h-[220px]">
              <h4 className="font-semibold text-gray-900 mb-4">
                Live Transcription
              </h4>
              {latestWhisperStatus === "in_progress" && (liveDraftTranscript || "").trim() && (
                <div className="mb-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                  Showing quick draft text while final transcript syncs in the background.
                </div>
              )}
              <div className="flex-1 bg-gray-50 rounded-lg p-3 sm:p-4 overflow-y-auto">
                <div className="text-gray-600 text-sm leading-relaxed">
                  <p>
                    {isPauseTranscriptPending
                      ? "Processing captured answer... saving segment and preparing transcript."
                      : liveDraftTranscript
                      ? liveDraftTranscript
                      : liveTranscriptText
                      ? liveTranscriptText
                      : liveDraftStatus
                      ? liveDraftStatus
                      : isSessionStarted && !isPaused
                      ? isUploadingSegment
                        ? "Saving current recording segment..."
                        : "Listening for your response... we will auto-capture your answer after a short silence."
                      : isSessionStarted
                      ? (isPaused
                        ? isPauseTranscriptPending
                          ? "Please wait a second, the transcribed text will show shortly."
                          : latestWhisperStatus === "failed"
                          ? "Transcription could not be generated for the captured answer. Please restart your answer and try again."
                          : latestWhisperStatus === "completed"
                          ? "No speech was detected in the latest captured answer."
                          : "Please wait a second, the transcribed text will show shortly."
                        : isUploadingSegment
                        ? "Saving current recording segment..."
                        : latestWhisperStatus === "failed"
                        ? "Transcription failed for the latest segment. Continue speaking and save the next segment to retry."
                        : latestWhisperStatus === "completed"
                        ? "Latest segment was processed, but no speech text was detected."
                        : "Listening for your response... we will auto-capture your answer after a short silence.")
                      : "Session not started yet. Start the session to begin transcription."}
                  </p>

                  {/* Evaluation runs silently in background — results appear in session summary */}
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
      </div>

      {showFinishSpeakingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">Finished speaking?</h4>
            <p className="mt-2 text-sm text-gray-600">
              We detected a pause. Save this answer and start transcription now?
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={handleContinueSpeaking}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-semibold"
                title="No, continue recording"
              >
                X
              </button>
              <button
                onClick={handleConfirmFinishedSpeaking}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-semibold"
                title="Yes, save this answer"
              >
                Check
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </li>
  );
}

function MetricCard({
  label,
  percentage,
  score,
  feedbacks,
}: {
  label: string;
  percentage: number | null;
  score?: number | null;
  feedbacks?: Record<number, string>;
}) {
  const hasPercentage = typeof percentage === "number";
  const barWidth = hasPercentage ? Math.max(0, Math.min(100, percentage)) : 0;

  const getFeedback = () => {
    if (!feedbacks || score == null) return null;
    const rounded = Math.round(score);
    const key = Math.max(1, Math.min(5, rounded)) as 1 | 2 | 3 | 4 | 5;
    return feedbacks[key] ?? null;
  };

  const getBarColor = () => {
    if (score == null) return "bg-[#1B2744]";
    if (score >= 4.5) return "bg-emerald-500";
    if (score >= 3.5) return "bg-blue-500";
    if (score >= 2.5) return "bg-indigo-500";
    if (score >= 1.5) return "bg-amber-500";
    return "bg-red-400";
  };

  const feedback = getFeedback();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{label}</h4>
        <span className="text-lg font-bold text-gray-900">
          {hasPercentage ? `${percentage}%` : "--"}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`${getBarColor()} h-2 rounded-full`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {feedback && (
        <p className="text-xs text-gray-600">{feedback}</p>
      )}
    </div>
  );
}

export default function MockInterviewPage() {
  const { user, signOut } = useAuth();
  const { profile } = useStudent();
  const navigate = useNavigate();
  const studentId = profile?.student_number != null ? String(profile.student_number) : '';
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate("/login");
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <MockInterviewPageContent
      email={user?.email || ""}
      userName={displayName}
      userId={user?.id || ""}
      studentId={studentId}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}

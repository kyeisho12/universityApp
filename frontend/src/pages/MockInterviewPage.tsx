import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Video,
  CheckCircle,
  Mic,
  Camera,
  ChevronRight,
  Volume2,
  RotateCcw,
  Square,
} from "lucide-react";
import evaluateAnswer from "../utils/robertaEvaluator";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useStudentId } from "../hooks/useStudentId";
import { useStudent } from "../context/StudentContext";
import { supabase } from "../lib/supabaseClient";
import {
  decideNextQuestionStep,
  getLatestQuestionTranscript,
  getMockInterviewQuestionsExcluding,
  getQuestionById,
  insertRecordingSegmentMetadata,
  startInterviewSession,
  triggerPendingSessionTranscriptions,
  triggerSegmentTranscription,
  transcribeLiveAudioChunk,
  updateInterviewSessionProgress,
  updateInterviewSessionStatus,
  uploadInterviewRecordingSegment,
  voidInterviewSession,
} from "../services/interviewService";

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

// Increase live chunk interval to reduce live transcription request rate (avoid 429)
const LIVE_CHUNK_INTERVAL_MS = 4000;
const LIVE_DRAFT_FALLBACK_TIMEOUT_MS = 1200;
const OPENING_QUESTION_ID = "890b7831-97c4-4f25-bf26-590ca44fbee7";
const RANDOM_BANK_QUESTION_COUNT = 5;
const MIN_SESSION_QUESTION_COUNT = 10;
const MAX_SESSION_QUESTION_COUNT = 30;
const STAR_AVERAGE_TARGET_SCORE = 4;
const AUTO_SILENCE_RMS_THRESHOLD = 0.015;
const AUTO_SILENCE_DURATION_MS = 1700;
const AUTO_MIN_SPEECH_MS = 800;
const AUTO_NOISE_FLOOR_ALPHA = 0.05;
const AUTO_SPEECH_MULTIPLIER = 1.8;
const AUTO_MAX_ANSWER_MS = 120000;
const AUTO_NO_SPEECH_TIMEOUT_MS = 8000;
const AUTO_NO_SPEECH_MIN_TRANSCRIPT_DELTA_CHARS = 12;
const FINISH_PROMPT_COOLDOWN_MS = 10000;
const TRANSCRIPT_FAST_POLL_MS = 800;
const TRANSCRIPT_NORMAL_POLL_MS = 2500;
const AUTO_CAPTURE_ARM_DELAY_MS = 3000;

function MockInterviewPageContent({
  email,
  userName,
  userId,
  studentId,
  onLogout,
  onNavigate,
}: MockInterviewPageContentProps & { studentId?: string }) {
  const userID = studentId || "2024-00001";
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
  useEffect(() => {
    setIsNextConfirmed(false);
  }, [preparedNextAction, currentQuestion, isSessionStarted]);
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

    const [openingResult, bankResult] = await Promise.all([
      getQuestionById(OPENING_QUESTION_ID),
      getMockInterviewQuestionsExcludingTyped({
        limit: RANDOM_BANK_QUESTION_COUNT,
        excludeIds: [OPENING_QUESTION_ID],
      }),
    ]);

    if (openingResult.error || !openingResult.data) {
      setQuestions([]);
      setBankQuestionPool([]);
      bankQuestionPoolRef.current = [];
      setQuestionsError("Failed to load question bank. Please try again.");
      setQuestionsLoading(false);
      return [];
    }

    if (bankResult.error) {
      setQuestions([]);
      setBankQuestionPool([]);
      bankQuestionPoolRef.current = [];
      setQuestionsError("Failed to load question bank. Please try again.");
      setQuestionsLoading(false);
      return [];
    }

    const openingQuestion: Question = {
      ...openingResult.data,
      source: "fixed",
      baseQuestionId: openingResult.data.id,
    };

    const bankPool = (bankResult.data || []).map((question: Question) => ({
      ...question,
      source: "bank" as const,
      baseQuestionId: question.id,
    }));

    if (bankPool.length === 0) {
      setQuestions([openingQuestion]);
      setBankQuestionPool([]);
      bankQuestionPoolRef.current = [];
      setQuestionsError("No active questions found in the question bank.");
      setQuestionsLoading(false);
      return [openingQuestion];
    }

    const initialQuestions = [openingQuestion];
    setQuestions(initialQuestions);
    setBankQuestionPool(bankPool);
    bankQuestionPoolRef.current = bankPool;
    setFollowupCountByBase({});
    setQuestionsLoading(false);
    return initialQuestions;
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

    return (bankResult.data || []).map((question: Question) => ({
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
      const bd = entry.val?.breakdown;
      if (bd && typeof bd === "object") {
        const dims = [bd.situation, bd.task, bd.action, bd.result, bd.reflection].map(Number);
        const validDims = dims.filter(Number.isFinite);
        if (validDims.length === 5) {
          const per = validDims.reduce((s, x) => s + x, 0) / 5;
          return sum + per;
        }
      }
      const fallback = Number(entry.val?.score);
      return sum + (Number.isFinite(fallback) ? fallback : 0);
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
      setLatestWhisperStatus(null);
      setLiveTranscriptText(null);
      return { hasTranscript: false, whisperStatus: null as string | null };
    }

    const whisperStatus = data.whisper_status || null;
    const transcriptText = data.transcript_text?.trim() || null;

    setLatestWhisperStatus(whisperStatus);
    setLiveTranscriptText(transcriptText);

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
          const result = await evaluateAnswer(questionText, transcriptText);
          setEvaluations((prev) => {
            const next = { ...(prev || {}), [qIndex]: { ...result, evaluatedAt: new Date().toISOString() } };
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
      // swallow evaluation errors to keep UI stable
      // console.error("Evaluation failed", err);
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

  useEffect(() => {
    if (!isSessionStarted) {
      setShowFinishSpeakingPrompt(false);
      return;
    }

    setShowFinishSpeakingPrompt(false);
    setLiveTranscriptText(null);
    setLatestWhisperStatus(null);
    setIsPauseTranscriptPending(false);
    setLiveDraftTranscript("");
    speechFinalTextRef.current = "";
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

  const completeSession = useCallback(async (message?: string) => {
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
          score_summary: {
            overall_average: Number(sessionStats.overallAverage.toFixed(2)),
            situation: Number(sessionStats.situation.toFixed(2)),
            task: Number(sessionStats.task.toFixed(2)),
            action: Number(sessionStats.action.toFixed(2)),
            result: Number(sessionStats.result.toFixed(2)),
            reflection: Number(sessionStats.reflection.toFixed(2)),
            evaluated_count: sessionStats.evaluatedCount,
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
  }, [computeSessionSTARStats, currentQuestion, getSessionTranscriptMetadata, questions.length, sessionId]);

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
    const speechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!speechCtor) {
      setUseLiveChunkFallback(true);
      setLiveDraftStatus(
        "Live draft transcription is not supported in this browser. Your recording will still be transcribed after each saved segment."
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
        setLiveDraftStatus("Speech recognition permission was blocked. Allow microphone access and restart the session.");
        return;
      }
      if (event?.error === "audio-capture") {
        setUseLiveChunkFallback(true);
        setLiveDraftStatus("No microphone input detected for live draft transcription.");
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
    } catch {
      setUseLiveChunkFallback(true);
      speechRecognitionRef.current = null;
      setLiveDraftStatus(
        "Live draft transcription could not start in this browser session. Your recording will still be transcribed after each saved segment."
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
      const [directTranscriptionResult, uploadResult] = await Promise.all([
        transcribeLiveAudioChunk({ audioBlob: segmentBlob }),
        uploadInterviewRecordingSegment({
          storagePath,
          segmentBlob,
          contentType: segmentBlob.type || "video/webm",
        }),
      ]);

      const directTranscriptText =
        (directTranscriptionResult.data?.transcript_text || "").trim();
      const directTranscriptionFailed = Boolean(directTranscriptionResult.error);

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
        status: directTranscriptionFailed ? "uploaded" : "transcribed",
        whisperStatus: directTranscriptionFailed ? "pending" : "completed",
        transcriptText: directTranscriptionFailed ? null : directTranscriptText,
        metadata: {
          recorded_at: new Date(segmentMeta.startedAt).toISOString(),
          direct_transcription: {
            success: !directTranscriptionFailed,
            source: "frontend_blob_to_backend_whisper",
            error: directTranscriptionResult.error?.message || null,
          },
        },
      });

      setIsUploadingSegment(false);
      if (segmentResult.error) {
        setRecordingError(`Failed to save segment metadata: ${segmentResult.error.message}`);
        return;
      }

      const createdSegmentId = segmentResult.data?.id;
      if (createdSegmentId && directTranscriptionFailed) {
        void (async () => {
          const transcriptionResult = await triggerSegmentTranscription({
            sessionId: activeSessionId,
            segmentId: createdSegmentId,
          });
          if (transcriptionResult.error) {
            setRecordingError(
              `Segment saved, but fast transcription failed and retry also failed: ${transcriptionResult.error.message}`
            );
          } else {
            setRecordingError("Segment saved. Final transcription completed after retry.");
          }
        })();
      } else if (directTranscriptionFailed) {
        setRecordingError(
          `Segment saved, but fast transcription failed: ${directTranscriptionResult.error?.message || "Unknown error"}.`
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

          if (chunks.length > 0 && segmentMeta) {
            const segmentBlob = new Blob(chunks, { type: mediaRecorder.mimeType || mimeType });
            await persistSegmentBlob(segmentBlob, segmentMeta);
            segmentOrderRef.current += 1;
          }

          if (pendingStopResolveRef.current) {
            pendingStopResolveRef.current();
            pendingStopResolveRef.current = null;
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
      pendingStopResolveRef.current = resolve;
      recorder.stop();
    });
    mediaRecorderRef.current = null;
  }, [stopLiveChunkTranscription, stopLiveDraftTranscription, stopSilenceDetection]);

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
        });
        setRecordingError(completeMessage);
        return;
      }

      if (hasReachedMinimumQuestions && hasReachedStarAverageTarget) {
        setPreparedNextAction({
          kind: "complete",
          message: `Session completed successfully after ${askedQuestionCount} questions. STAR average reached ${sessionStarAverage.toFixed(2)} / 5 (target ${STAR_AVERAGE_TARGET_SCORE.toFixed(1)}).`,
        });
        setRecordingError(completeMessage);
        return;
      }

      setIsDecidingNextQuestion(true);
      let decisionResult;
      try {
        decisionResult = await decideNextQuestionStepTyped({
          currentQuestion: activeQuestion.question,
          candidateAnswer,
          category: activeQuestion.type,
          remainingBankQuestions: bankQuestionPool.length,
          followupCountForCurrent,
        });
      } finally {
        setIsDecidingNextQuestion(false);
      }

      const shouldAskFollowup =
        !decisionResult.error &&
        decisionResult.data?.action === "follow_up" &&
        Boolean(decisionResult.data?.followup_question);

      if (shouldAskFollowup) {
        if (questions.length >= MAX_SESSION_QUESTION_COUNT) {
          setPreparedNextAction({
            kind: "complete",
            message: `Session ended after reaching the maximum of ${MAX_SESSION_QUESTION_COUNT} questions.`,
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

        setPreparedNextAction({
          kind: "followup",
          question: followupQuestion,
          nextQuestionIndex: questions.length,
          baseQuestionId,
        });
        setRecordingError(preparedMessage);
        return;
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
        const [nextBankQuestion, ...remainingPool] = nextPool;
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
          await completeSession(preparedNextAction.message);
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
    stopLiveDraftTranscription();
    stopLiveChunkTranscription();
    stopCamera();
    void stopMicLoopback();
  };

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

    await completeSession();
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
          <Sidebar
            userName={userName}
            userID={userID}
            onLogout={onLogout}
            onNavigate={onNavigate}
            activeNav="student/interview"
          />

          <div className="flex-1 overflow-auto">
            <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900 ml-auto" />
            </div>

            <div className="p-8 space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Mock Interview Sessions</h1>
                <p className="text-gray-500 mt-1">Review your past interview attempts and scores.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="text-3xl font-semibold text-gray-900 mb-1">{historySessions.length}</div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="text-3xl font-semibold text-gray-900 mb-1">{completedSessions}</div>
                  <div className="text-sm text-gray-600">Completed Sessions</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="text-3xl font-semibold text-gray-900 mb-1">
                    {averageScore !== null ? averageScore.toFixed(2) : "—"}
                  </div>
                  <div className="text-sm text-gray-600">Average Score (1-5)</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Past Sessions</h3>
                  <button
                    onClick={() => setShowHistoryView(false)}
                    className="bg-[#1B2744] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#131d33] transition-colors"
                  >
                    Take Mock Interview
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Questions</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyLoading ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                            Loading sessions...
                          </td>
                        </tr>
                      ) : historySessions.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
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
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/interview"
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Top Navigation */}
          <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900 ml-auto" />
          </div>

          {/* Content Area */}
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">
                  AI Mock Interview
                </h1>
                <span className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  AI-Powered
                </span>
              </div>
              <p className="text-gray-500">
                Practice your interview skills with AI-evaluated feedback
              </p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 max-w-3xl mx-auto">
              {/* Video Icon */}
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-gray-600" />
              </div>

              {/* Title */}
              <h2 className="text-4xl font-bold text-gray-900 text-center mb-4">
                Ready to Practice?
              </h2>

              {/* Description */}
              <p className="text-gray-600 text-center mb-8 text-lg leading-relaxed">
                This AI-powered mock interview will help you practice answering
                common interview questions. Your responses will be recorded,
                transcribed, and evaluated based on HR-validated criteria.
              </p>

              {/* Checklist */}
              <div className="bg-cyan-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Before You Start
                </h3>
                <ul className="space-y-3">
                  <ChecklistItem text="Ensure your microphone and camera are working" />
                  <ChecklistItem text="Find a quiet environment" />
                  <ChecklistItem text="Respond in English for accurate transcription" />
                  <ChecklistItem text="Speak clearly and at a moderate pace" />
                </ul>
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
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Start Mock Interview
              </button>
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
        {/* Sidebar */}
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/interview"
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Top Navigation */}
          <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900 ml-auto" />
          </div>

          {/* Content Area */}
          <div className="p-8">
            {/* Completion Card */}
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 max-w-2xl mx-auto">
              {/* Success Icon */}
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Heading */}
              <h1 className="text-4xl font-bold text-gray-900 text-center mb-2">
                Interview Complete!
              </h1>
              <p className="text-gray-500 text-center mb-8">
                Your interview has been submitted successfully.
              </p>

              {/* Overall Score Card */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
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
                </div>
              </div>

              {/* Evaluation Metrics (STAR method) */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Evaluation Metrics (STAR)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <MetricCard
                    label="Situation clarity"
                    percentage={Math.round((sessionStats.situation / 5) * 100)}
                    description="Clearly describes the situation or context"
                  />
                  <MetricCard
                    label="Task ownership"
                    percentage={Math.round((sessionStats.task / 5) * 100)}
                    description="States the task and shows ownership/responsibility"
                  />
                  <MetricCard
                    label="Action specificity"
                    percentage={Math.round((sessionStats.action / 5) * 100)}
                    description="Provides specific actions taken with detail"
                  />
                  <MetricCard
                    label="Result measurability"
                    percentage={Math.round((sessionStats.result / 5) * 100)}
                    description="Describes measurable outcomes or impact"
                  />
                  <MetricCard
                    label="Reflection & learning"
                    percentage={Math.round((sessionStats.reflection / 5) * 100)}
                    description="Shows learning and reflection from the experience"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handlePracticeAgain}
                  className="w-full bg-[#1B2744] text-white py-3.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors"
                >
                  Practice Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interview Recording Screen
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userID={userID}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="student/interview"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900 ml-auto" />
        </div>

        {/* Recording Interface */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Left - Camera Preview */}
          <div className="flex-1 flex flex-col">
            {/* Recording Status and Controls */}
            <div className="bg-gray-300 rounded-2xl flex-1 flex flex-col items-center justify-between p-6 mb-4 relative">
              {/* Recording Badge */}
              {isSessionStarted && (
                <div
                  className={
                    isPauseTranscriptPending
                      ? "absolute top-6 left-6 inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-full"
                      : isPaused
                      ? "absolute top-6 left-6 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full"
                      : "absolute top-6 left-6 inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full"
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
              )}
              {isSessionStarted &&
                isPaused &&
                preparedNextAction &&
                !isAdvancingNextQuestion &&
                !isDecidingNextQuestion &&
                !isPauseTranscriptPending && (
                  <div className="absolute top-6 right-6 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    Done
                  </div>
                )}

              {/* Camera Preview */}
              <div className="flex items-center justify-center h-full">
                {isCameraOn && !mediaError ? (
                  <div className="w-full h-full rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-400 rounded-full flex items-center justify-center mb-4">
                      <Camera className="w-16 h-16 text-gray-600" />
                    </div>
                    <p className="text-gray-600 font-medium">Camera Preview</p>
                    {mediaError && (
                      <p className="text-xs text-red-600 mt-2 text-center max-w-xs">
                        {mediaError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-3 shadow-lg">
                <button
                  onClick={handleToggleMic}
                  className={
                    isMicOn
                      ? "p-2 text-gray-600 hover:text-gray-900"
                      : "p-2 text-red-600 hover:text-red-700"
                  }
                  title={isMicOn ? "Mute mic" : "Unmute mic"}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <button
                  onClick={handleToggleMicLoopback}
                  disabled={!isMicOn || isSessionStarted}
                  className={
                    !isMicOn || isSessionStarted
                      ? "p-2 text-gray-400 cursor-not-allowed"
                      : isMicLoopbackOn
                      ? "p-2 text-cyan-600 hover:text-cyan-700"
                      : "p-2 text-gray-600 hover:text-gray-900"
                  }
                  title={
                    isSessionStarted
                      ? "Mic loopback is available only before session start"
                      : isMicLoopbackOn
                      ? "Stop mic loopback test"
                      : "Start mic loopback test"
                  }
                >
                  <Volume2 className="w-6 h-6" />
                </button>
                <button
                  onClick={handleToggleCamera}
                  className={
                    isCameraOn
                      ? "p-2 text-gray-600 hover:text-gray-900"
                      : "p-2 text-red-600 hover:text-red-700"
                  }
                  title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                >
                  <Camera className="w-6 h-6" />
                </button>
                <button
                  onClick={handleRestartCurrentAnswer}
                  disabled={!isSessionStarted || !isPaused || isPauseTranscriptPending || isUploadingSegment || isDecidingNextQuestion || isAdvancingNextQuestion}
                  className={
                    !isSessionStarted || !isPaused || isPauseTranscriptPending || isUploadingSegment || isDecidingNextQuestion || isAdvancingNextQuestion
                      ? "px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-400 cursor-not-allowed flex items-center gap-2"
                      : "px-4 py-2 rounded-lg font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-2"
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
                  Restart Answer
                </button>
                <button
                  disabled={
                    isUploadingSegment ||
                    isDecidingNextQuestion ||
                    isAdvancingNextQuestion ||
                    (isSessionStarted && isPauseTranscriptPending && !(liveDraftTranscript || "").trim())
                  }
                  className="bg-[#1B2744] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#131d33] transition-colors flex items-center gap-2"
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
                    ? "Next Question"
                    : "Start Session"}
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={!isSessionStarted || isAdvancingNextQuestion}
                  className={
                    !isSessionStarted || isAdvancingNextQuestion
                      ? "px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                  }
                  title="End session"
                >
                  <Square className="w-4 h-4" />
                  End Session
                </button>
              </div>
              {(micTestError || isMicLoopbackOn) && (
                <p className="text-xs text-center mt-3 text-gray-700">
                  {micTestError || "Mic loopback test is active. Use earphones to avoid feedback."}
                </p>
              )}
              {(recordingError || isUploadingSegment || savedSegmentCount > 0) && (
                <p className="text-xs text-center mt-2 text-gray-700">
                  {recordingError || (isUploadingSegment
                    ? "Uploading recorded segment..."
                    : `${savedSegmentCount} segment${savedSegmentCount > 1 ? "s" : ""} saved`)}
                </p>
              )}
            </div>
          </div>

          {/* Right - Question and Transcription */}
          <div className="w-96 flex flex-col gap-6 overflow-y-auto">
            {/* Question Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-cyan-600 text-sm font-semibold mb-2 uppercase">
                {isSessionStarted
                  ? (questions[currentQuestion]?.type || "Question")
                  : "Preview"}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {isSessionStarted
                  ? (questions[currentQuestion]?.question || "Loading question...")
                  : "Test your camera and microphone before starting the session."}
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    {isSessionStarted
                      ? (questions[currentQuestion]?.tip || "Please wait while we fetch your question.")
                      : "When ready, click Start Session to begin recording and show your first interview question."}
                  </span>
                </p>
              </div>
              {isSessionStarted && (
                <div className="mt-3 bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                  <p className="text-xs text-cyan-800">
                    Click Next Question to finalize this answer. When the done badge appears, you can either Restart Answer or click Next Question again to continue.
                  </p>
                </div>
              )}
              {questionsError && (
                <p className="text-sm text-red-600 mt-3">{questionsError}</p>
              )}
            </div>

            {/* Live Transcription */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-1 flex flex-col">
              <h4 className="font-semibold text-gray-900 mb-4">
                Live Transcription
              </h4>
              {latestWhisperStatus === "in_progress" && (liveDraftTranscript || "").trim() && (
                <div className="mb-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                  Showing quick draft text while final transcript syncs in the background.
                </div>
              )}
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto">
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
    </div>
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
  description,
}: {
  label: string;
  percentage: number | null;
  description: string;
}) {
  const hasPercentage = typeof percentage === "number";
  const barWidth = hasPercentage ? Math.max(0, Math.min(100, percentage)) : 0;

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
          className="bg-[#1B2744] h-2 rounded-full"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default function MockInterviewPage() {
  const { user, signOut } = useAuth();
  const { profile } = useStudent();
  const navigate = useNavigate();
  const studentId = useStudentId(user?.id);
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

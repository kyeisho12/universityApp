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
  Pause,
  Play,
  Square,
} from "lucide-react";
import evaluateAnswer from "../utils/robertaEvaluator";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useStudentId } from "../hooks/useStudentId";
import { useStudent } from "../context/StudentContext";
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
}

interface PersistedMockInterviewState {
  hasStarted: boolean;
  isSessionStarted: boolean;
  isPaused?: boolean;
  isCompleted: boolean;
  currentQuestion: number;
  isCameraOn: boolean;
  isMicOn: boolean;
  sessionId?: string | null;
  storagePrefix?: string | null;
  savedSegmentCount?: number;
  questions?: Question[];
  bankQuestionPool?: Question[];
  followupCountByBase?: Record<string, number>;
}

// Increase live chunk interval to reduce live transcription request rate (avoid 429)
const LIVE_CHUNK_INTERVAL_MS = 4000;
const LIVE_DRAFT_FALLBACK_TIMEOUT_MS = 1200;
const OPENING_QUESTION_ID = "890b7831-97c4-4f25-bf26-590ca44fbee7";
const RANDOM_BANK_QUESTION_COUNT = 5;
const MIN_SESSION_QUESTION_COUNT = 10;
const MAX_SESSION_QUESTION_COUNT = 30;
const STAR_AVERAGE_TARGET_SCORE = 4;

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
    isCompleted: boolean;
    currentQuestion: number;
    isCameraOn: boolean;
    isMicOn: boolean;
    sessionId: string | null;
    storagePrefix: string | null;
    savedSegmentCount: number;
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
          isCompleted: Boolean(parsed.isCompleted),
          currentQuestion: typeof parsed.currentQuestion === "number" ? parsed.currentQuestion : 0,
          isCameraOn: Boolean(parsed.isCameraOn),
          isMicOn: typeof parsed.isMicOn === "boolean" ? parsed.isMicOn : true,
          sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : null,
          storagePrefix: typeof parsed.storagePrefix === "string" ? parsed.storagePrefix : null,
          savedSegmentCount: typeof parsed.savedSegmentCount === "number" ? parsed.savedSegmentCount : 0,
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
  const [liveDraftTranscript, setLiveDraftTranscript] = useState("");
  const [fullSessionTranscript, setFullSessionTranscript] = useState("");
  const [liveTranscriptText, setLiveTranscriptText] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Record<number, any>>({});
  const lastEvaluatedTranscriptRef = useRef<Record<number, string>>({});
  const [latestWhisperStatus, setLatestWhisperStatus] = useState<string | null>(null);
  const [isPauseTranscriptPending, setIsPauseTranscriptPending] = useState(false);
  const [liveDraftStatus, setLiveDraftStatus] = useState<string | null>(null);
  const [useLiveChunkFallback, setUseLiveChunkFallback] = useState(false);
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
        isCompleted,
        currentQuestion,
        isCameraOn,
        isMicOn,
        sessionId,
        storagePrefix,
        savedSegmentCount,
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
  }, [hasStarted, isSessionStarted, isPaused, isCompleted, currentQuestion, isCameraOn, isMicOn, sessionId, storagePrefix, savedSegmentCount, questions, bankQuestionPool, followupCountByBase, stateKey]);

  const persistSnapshot = useCallback(() => {
    if (!stateKey) return;
    try {
      const nextState = {
        hasStarted,
        isSessionStarted,
        isPaused,
        isCompleted,
        currentQuestion,
        isCameraOn,
        isMicOn,
        sessionId,
        storagePrefix,
        savedSegmentCount,
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
  }, [stateKey, hasStarted, isSessionStarted, isPaused, isCompleted, currentQuestion, isCameraOn, isMicOn, sessionId, storagePrefix, savedSegmentCount, questions, bankQuestionPool, followupCountByBase]);

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

    const openingResult = await getQuestionById(OPENING_QUESTION_ID);
    if (openingResult.error || !openingResult.data) {
      setQuestions([]);
      setBankQuestionPool([]);
      bankQuestionPoolRef.current = [];
      setQuestionsError("Failed to load question bank. Please try again.");
      setQuestionsLoading(false);
      return [];
    }

    const bankResult = await getMockInterviewQuestionsExcluding({
      limit: RANDOM_BANK_QUESTION_COUNT,
      excludeIds: [OPENING_QUESTION_ID],
    });

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

    const bankPool = (bankResult.data || []).map((question) => ({
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

    const bankResult = await getMockInterviewQuestionsExcluding({
      limit: requestedLimit,
      excludeIds: usedQuestionIds,
    });

    if (bankResult.error) {
      setQuestionsError("Failed to load additional question bank items. Please try again.");
      return [];
    }

    return (bankResult.data || []).map((question) => ({
      ...question,
      source: "bank" as const,
      baseQuestionId: question.id,
    }));
  }, [questions]);

  const calculateSessionStarAverage = useCallback(() => {
    if (questions.length === 0) {
      return 0;
    }

    const totalScore = questions.reduce((sum, _question, index) => {
      const value = Number(evaluations[index]?.score);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return totalScore / questions.length;
  }, [evaluations, questions]);

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
      const lastSeen = lastEvaluatedTranscriptRef.current[qIndex];

      if (whisperStatus === "completed" && hasText) {
        if (!alreadyEvaluated || lastSeen !== transcriptText) {
          // record so we don't re-evaluate the same transcript repeatedly
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
    const maxAttempts = 10;
    setIsPauseTranscriptPending(true);

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const result = await refreshLiveTranscript();
        if (result.hasTranscript || result.whisperStatus === "completed" || result.whisperStatus === "failed") {
          return;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 800);
          });
        }
      }
    } finally {
      setIsPauseTranscriptPending(false);
    }
  }, [refreshLiveTranscript]);

  useEffect(() => {
    if (!isSessionStarted) {
      return;
    }

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
    const pollId = window.setInterval(() => {
      void refreshLiveTranscript();
    }, 3000);

    return () => {
      window.clearInterval(pollId);
    };
  }, [isSessionStarted, refreshLiveTranscript, sessionId]);

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
    setIsCompleted(true);

    if (message) {
      setRecordingError(message);
    }

    if (sessionId) {
      await updateInterviewSessionStatus(sessionId, "completed", {
        ended_at: new Date().toISOString(),
        metadata: getSessionTranscriptMetadata(),
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
  }, [getSessionTranscriptMetadata, sessionId]);

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
      const uploadResult = await uploadInterviewRecordingSegment({
        storagePath,
        segmentBlob,
        contentType: segmentBlob.type || "video/webm",
      });

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
        status: "uploaded",
        whisperStatus: "pending",
        metadata: {
          recorded_at: new Date(segmentMeta.startedAt).toISOString(),
        },
      });

      setIsUploadingSegment(false);
      if (segmentResult.error) {
        setRecordingError(`Failed to save segment metadata: ${segmentResult.error.message}`);
        return;
      }

      const createdSegmentId = segmentResult.data?.id;
      if (createdSegmentId) {
        void (async () => {
          const transcriptionResult = await triggerSegmentTranscription({
            sessionId: activeSessionId,
            segmentId: createdSegmentId,
          });
          if (transcriptionResult.error) {
            setRecordingError(
              `Segment saved, but transcription failed: ${transcriptionResult.error.message}`
            );
          }
        })();
      }

      setSavedSegmentCount((prev) => prev + 1);
      setRecordingError(null);
    },
    []
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
        };

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stopLiveDraftTranscription();
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
      storagePrefix,
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

    await new Promise<void>((resolve) => {
      pendingStopResolveRef.current = resolve;
      recorder.stop();
    });
    mediaRecorderRef.current = null;
  }, [stopLiveChunkTranscription, stopLiveDraftTranscription]);

  const handleNextQuestion = useCallback(async () => {
    if (questions.length === 0) {
      return;
    }

    if (isDecidingNextQuestion) {
      return;
    }

    if (!isPaused) {
      setRecordingError(
        "Please click Pause first to save and transcribe your current answer before moving to the next question."
      );
      return;
    }

    if (isPauseTranscriptPending) {
      setRecordingError(
        "Transcription is still processing for this paused answer. Please wait a moment, then click Next Question again."
      );
      return;
    }

    await stopActiveRecording();

    const activeQuestion = questions[currentQuestion];
    if (!activeQuestion) {
      return;
    }

    const baseQuestionId = activeQuestion.baseQuestionId || activeQuestion.id;
    const followupCountForCurrent = followupCountByBase[baseQuestionId] || 0;
    const answerText = (liveTranscriptText || liveDraftTranscript || "").trim();
    const candidateAnswer = answerText || "No clear answer captured from transcript.";

    const askedQuestionCount = questions.length;
    const sessionStarAverage = calculateSessionStarAverage();
    const hasReachedMinimumQuestions = askedQuestionCount >= MIN_SESSION_QUESTION_COUNT;
    const hasReachedStarAverageTarget = sessionStarAverage >= STAR_AVERAGE_TARGET_SCORE;

    if (askedQuestionCount >= MAX_SESSION_QUESTION_COUNT) {
      await completeSession(
        `Session ended after reaching the maximum of ${MAX_SESSION_QUESTION_COUNT} questions. Final STAR average: ${sessionStarAverage.toFixed(2)} / 5.`
      );
      return;
    }

    if (hasReachedMinimumQuestions && hasReachedStarAverageTarget) {
      await completeSession(
        `Session completed successfully after ${askedQuestionCount} questions. STAR average reached ${sessionStarAverage.toFixed(2)} / 5 (target ${STAR_AVERAGE_TARGET_SCORE.toFixed(1)}).`
      );
      return;
    }

    setIsDecidingNextQuestion(true);

    const decisionResult = await decideNextQuestionStep({
      currentQuestion: activeQuestion.question,
      candidateAnswer,
      category: activeQuestion.type,
      remainingBankQuestions: bankQuestionPool.length,
      followupCountForCurrent,
    });

    setIsDecidingNextQuestion(false);

    const shouldAskFollowup =
      !decisionResult.error &&
      decisionResult.data?.action === "follow_up" &&
      Boolean(decisionResult.data?.followup_question);

    if (shouldAskFollowup) {
      if (questions.length >= MAX_SESSION_QUESTION_COUNT) {
        await completeSession(
          `Session ended after reaching the maximum of ${MAX_SESSION_QUESTION_COUNT} questions.`
        );
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

      const nextQuestionIndex = questions.length;
      activeQuestionIndexRef.current = nextQuestionIndex;
      setLiveTranscriptText(null);
      setLatestWhisperStatus(null);
      setIsPauseTranscriptPending(false);
      setLiveDraftTranscript("");
      setQuestions((previous) => [...previous, followupQuestion]);
      setFollowupCountByBase((previous) => ({
        ...previous,
        [baseQuestionId]: (previous[baseQuestionId] || 0) + 1,
      }));
      setCurrentQuestion(nextQuestionIndex);

      if (sessionId) {
        await updateInterviewSessionProgress(sessionId, nextQuestionIndex);
        await updateInterviewSessionStatus(sessionId, "in_progress", {
          resumed_at: new Date().toISOString(),
        });
      }
      setIsPaused(false);
      await startSegmentRecording(nextQuestionIndex, undefined, followupQuestion);
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
      const nextQuestionIndex = questions.length;
      activeQuestionIndexRef.current = nextQuestionIndex;
      setLiveTranscriptText(null);
      setLatestWhisperStatus(null);
      setIsPauseTranscriptPending(false);
      setLiveDraftTranscript("");
      setQuestions((previous) => [...previous, nextBankQuestion]);
      setBankQuestionPool(remainingPool);
      bankQuestionPoolRef.current = remainingPool;
      setCurrentQuestion(nextQuestionIndex);

      if (sessionId) {
        await updateInterviewSessionProgress(sessionId, nextQuestionIndex);
        await updateInterviewSessionStatus(sessionId, "in_progress", {
          resumed_at: new Date().toISOString(),
        });
      }
      setIsPaused(false);
      await startSegmentRecording(nextQuestionIndex, undefined, nextBankQuestion);
      return;
    }
    const minimumMsg = hasReachedMinimumQuestions
      ? ""
      : ` Minimum required is ${MIN_SESSION_QUESTION_COUNT} questions.`;
    await completeSession(
      `Session ended because no more questions are available in the bank.${minimumMsg} Final STAR average: ${sessionStarAverage.toFixed(2)} / 5.`
    );
  }, [
    bankQuestionPool,
    calculateSessionStarAverage,
    completeSession,
    currentQuestion,
    fetchAdditionalBankQuestions,
    followupCountByBase,
    isDecidingNextQuestion,
    isPauseTranscriptPending,
    isPaused,
    liveDraftTranscript,
    liveTranscriptText,
    questions,
    sessionId,
    startSegmentRecording,
    stopActiveRecording,
  ]);

  const handlePracticeAgain = () => {
    setHasStarted(false);
    setIsSessionStarted(false);
    setIsPaused(false);
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
    stopLiveDraftTranscription();
    stopLiveChunkTranscription();
    stopCamera();
    void stopMicLoopback();
  };

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

  const handleTogglePause = useCallback(async () => {
    if (!isSessionStarted) return;

    if (!isPaused) {
      await stopActiveRecording();
      setIsPaused(true);
      if (sessionId) {
        await updateInterviewSessionStatus(sessionId, "paused", {
          paused_at: new Date().toISOString(),
        });
      }
      await refreshTranscriptAfterPause();
      return;
    }

    setIsPaused(false);
    setIsPauseTranscriptPending(false);
    if (sessionId) {
      await updateInterviewSessionStatus(sessionId, "in_progress", {
        resumed_at: new Date().toISOString(),
      });
    }
    await startSegmentRecording(currentQuestion);
  }, [
    currentQuestion,
    isPaused,
    isSessionStarted,
    isPauseTranscriptPending,
    refreshTranscriptAfterPause,
    sessionId,
    startSegmentRecording,
    stopActiveRecording,
  ]);

  const handleEndSession = useCallback(async () => {
    await stopActiveRecording();
    await completeSession();
  }, [completeSession, stopActiveRecording]);

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
      stopCamera();
      void stopMicLoopback();
    },
    [stopCamera, stopLiveChunkTranscription, stopLiveDraftTranscription, stopMicLoopback]
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
    return null;
  }

  if (!hasStarted) {
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
                      strokeDasharray={`${(0 / 100) * 339.29} 339.29`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">--</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Overall Score</p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Evaluation not available
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
                    percentage={null}
                    description="Clearly describes the situation or context"
                  />
                  <MetricCard
                    label="Task ownership"
                    percentage={null}
                    description="States the task and shows ownership/responsibility"
                  />
                  <MetricCard
                    label="Action specificity"
                    percentage={null}
                    description="Provides specific actions taken with detail"
                  />
                  <MetricCard
                    label="Result measurability"
                    percentage={null}
                    description="Describes measurable outcomes or impact"
                  />
                  <MetricCard
                    label="Reflection & learning"
                    percentage={null}
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
                    isPaused
                      ? "absolute top-6 left-6 inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-full"
                      : "absolute top-6 left-6 inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full"
                  }
                >
                  <span
                    className={
                      isPaused
                        ? "w-2 h-2 bg-white rounded-full"
                        : "w-2 h-2 bg-white rounded-full animate-pulse"
                    }
                  />
                  {isPaused ? "Paused" : "Recording"}
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
                  onClick={handleTogglePause}
                  disabled={!isSessionStarted}
                  className={
                    !isSessionStarted
                      ? "p-2 text-gray-400 cursor-not-allowed"
                      : isPaused
                      ? "p-2 text-cyan-600 hover:text-cyan-700"
                      : "p-2 text-gray-600 hover:text-gray-900"
                  }
                  title={isPaused ? "Resume recording" : "Pause recording"}
                >
                  {isPaused ? (
                    <Play className="w-6 h-6" />
                  ) : (
                    <Pause className="w-6 h-6" />
                  )}
                </button>
                <button
                  disabled={isUploadingSegment || isDecidingNextQuestion}
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
                      setIsSessionStarted(true);
                      setIsPaused(false);
                      setCurrentQuestion(0);
                      await startSegmentRecording(0, {
                        sessionId: sessionResult.data.id,
                        storagePrefix: sessionResult.data.storage_prefix,
                      }, questionSet[0]);
                      return;
                    }
                    await handleNextQuestion();
                  }}
                  title={
                    isSessionStarted && !isPaused
                      ? "Pause first to save and transcribe your answer"
                      : isSessionStarted && isPauseTranscriptPending
                      ? "Waiting for transcription to finish"
                      : isSessionStarted
                      ? "Go to next question"
                      : "Start session"
                  }
                >
                  {questionsLoading
                    ? "Loading Questions..."
                    : isUploadingSegment
                    ? "Saving Segment..."
                    : isDecidingNextQuestion
                    ? "Deciding Next..."
                    : isSessionStarted
                    ? "Next Question"
                    : "Start Session"}
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={!isSessionStarted}
                  className={
                    !isSessionStarted
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
                    For each question, click Pause after you finish speaking to save your answer and show the transcript.
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
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto">
                <div className="text-gray-600 text-sm leading-relaxed">
                  <p>
                    {liveDraftTranscript
                      ? liveDraftTranscript
                      : liveDraftStatus
                      ? liveDraftStatus
                      : liveTranscriptText
                      ? liveTranscriptText
                      : isSessionStarted
                      ? (isPaused
                        ? isPauseTranscriptPending
                          ? "Please wait a second, the transcribed text will show shortly."
                          : latestWhisperStatus === "failed"
                          ? "Transcription could not be generated for this pause. Please answer again, then click Pause once more."
                          : latestWhisperStatus === "completed"
                          ? "No speech was detected in the last paused segment."
                          : "Please wait a second, the transcribed text will show shortly."
                        : isUploadingSegment
                        ? "Saving current recording segment..."
                        : latestWhisperStatus === "failed"
                        ? "Transcription failed for the latest segment. Continue speaking and save the next segment to retry."
                        : latestWhisperStatus === "completed"
                        ? "Latest segment was processed, but no speech text was detected."
                        : "Listening for your response... Click Pause after answering to generate transcript for this question.")
                      : "Session not started yet. Start the session to begin transcription."}
                  </p>

                  {/* Evaluation panel for current question if available */}
                  {evaluations && evaluations[currentQuestion] && (
                    <div className="mt-4 bg-white border rounded-md p-3">
                      <h5 className="font-semibold text-gray-800">Evaluation Results</h5>
                      <div className="mt-2 text-sm text-gray-700">
                        <p>
                          <strong>Source:</strong> {evaluations[currentQuestion].source}
                        </p>
                        <p>
                          <strong>Score:</strong> {evaluations[currentQuestion].score} / 5
                        </p>
                        <p>
                          <strong>Similarity:</strong> {evaluations[currentQuestion].similarity ?? 0}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {evaluations[currentQuestion].breakdown &&
                            Object.entries(evaluations[currentQuestion].breakdown).map(([k, v]) => (
                              <div key={k} className="text-xs">
                                <div className="text-gray-600">{k}</div>
                                <div className="font-medium">{v} / 5</div>
                              </div>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Evaluated at: {evaluations[currentQuestion].evaluatedAt}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

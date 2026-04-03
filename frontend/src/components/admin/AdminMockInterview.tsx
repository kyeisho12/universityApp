import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import { useMessageBox } from "../common/MessageBoxProvider";
import {
  X,
  Eye,
  Menu,
  Search,
  Video,
  Users,
  BarChart2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import evaluateAnswer from "../../utils/robertaEvaluator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Session {
  id: string;
  user_id: string;
  user_name: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  total_questions: number | null;
}

interface Segment {
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

// ---------------------------------------------------------------------------
// Evaluation localStorage cache
// ---------------------------------------------------------------------------
const getSegEvalCache = (segId: string) => {
  try { const r = localStorage.getItem(`seg_eval_${segId}`); return r ? JSON.parse(r) : null; } catch { return null; }
};
const setSegEvalCache = (segId: string, ev: any) => {
  try { localStorage.setItem(`seg_eval_${segId}`, JSON.stringify(ev)); } catch {}
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scoreBadgeClass(score: number | null | undefined) {
  if (score == null) return "bg-gray-100 text-gray-500";
  if (score >= 4) return "bg-emerald-100 text-emerald-700";
  if (score >= 3) return "bg-cyan-100 text-cyan-700";
  if (score >= 2) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    voided: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

// ---------------------------------------------------------------------------
// VideoPlayer
// ---------------------------------------------------------------------------
function VideoPlayer({ src, mime, loading }: { src: string | null; mime?: string; loading?: boolean }) {
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
        <span className="text-sm text-gray-400">
          {!src ? "No recording available" : "Video could not be loaded"}
        </span>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      controls
      className="w-full aspect-video bg-black rounded-xl"
      onError={() => setError(true)}
    >
      <source src={src} type={mime || "video/webm"} />
      Your browser does not support the video tag.
    </video>
  );
}

// ---------------------------------------------------------------------------
// STAR breakdown bar
// ---------------------------------------------------------------------------
function StarBar({ label, value }: { label: string; value: number | undefined }) {
  const v = value ?? 0;
  const color =
    v >= 4 ? "bg-emerald-500" : v >= 3 ? "bg-cyan-500" : v >= 2 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 capitalize">{label}</span>
        <span className="font-medium text-gray-800">{v} / 5</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(v / 5) * 100}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question accordion card
// ---------------------------------------------------------------------------
function QuestionCard({ qIdx, segments, loadingVideos }: { qIdx: string; segments: Segment[]; loadingVideos?: boolean }) {
  const [open, setOpen] = React.useState(true);
  const first = segments[0];
  const score: number | null = first?.evaluation?.score ?? null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-gray-900 shrink-0">
            Question #{Number(qIdx) + 1}
          </span>
          {first?.questionText && (
            <span className="text-sm text-gray-500 truncate hidden sm:block">
              — {first.questionText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {score != null && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBadgeClass(score)}`}>
              {score.toFixed(2)} / 5
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-5">
          {/* Question text pill */}
          {first?.questionText && (
            <p className="text-sm font-medium text-gray-800 bg-cyan-50 border border-cyan-100 rounded-lg px-4 py-3">
              {first.questionText}
            </p>
          )}

          {segments.map((seg) => (
            <div key={seg.id} className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* LEFT — Video */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Recording{segments.length > 1 && seg.segment_order != null ? ` — Segment ${seg.segment_order}` : ""}
                </p>
                <VideoPlayer src={seg.signedUrl} mime={seg.mime_type || seg.metadata?.mime_type || "video/webm"} loading={loadingVideos && !seg.signedUrl} />
              </div>

              {/* RIGHT — Transcript + Evaluation */}
              <div className="flex flex-col gap-4">
                {/* Transcript */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transcript</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 leading-relaxed min-h-[100px] max-h-48 overflow-y-auto">
                    {seg.transcript_text?.trim() || (
                      <span className="text-gray-400 italic">No transcript available.</span>
                    )}
                  </div>
                </div>

                {/* Evaluation */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Evaluation</p>
                  {seg.evaluation?.score != null ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-bold px-3 py-1 rounded-lg ${scoreBadgeClass(seg.evaluation.score)}`}>
                          {seg.evaluation.score.toFixed(2)} / 5
                        </span>
                        {seg.evaluation.hrLabel && (
                          <span className="text-xs text-gray-500 text-right max-w-[160px]">{seg.evaluation.hrLabel}</span>
                        )}
                      </div>
                      {seg.evaluation.breakdown && (
                        <div className="space-y-2">
                          {Object.entries(seg.evaluation.breakdown).map(([k, v]) => (
                            <StarBar key={k} label={k} value={v as number} />
                          ))}
                        </div>
                      )}
                      {seg.evaluation.datasetSimilarity != null && (
                        <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                          Dataset similarity: {(seg.evaluation.datasetSimilarity * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-400 italic min-h-[60px] flex items-center">
                      {seg.transcript_text?.trim()
                        ? "Evaluation failed or unavailable."
                        : "No transcript — evaluation skipped."}
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminMockInterview() {
  const messageBox = useMessageBox();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const userName = user?.email?.split("@")[0] || "";
  const userID = user?.id ?? "";

  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null);
  const [segmentsByQuestion, setSegmentsByQuestion] = React.useState<Record<string, Segment[]>>({});
  const [loadingSegments, setLoadingSegments] = React.useState(false);
  const [loadingVideos, setLoadingVideos] = React.useState(false);
  const [exportingId, setExportingId] = React.useState<string | null>(null);
  const viewStateKey = `admin_mock_interview_view_${user?.id || "anon"}`;
  const pendingSessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(viewStateKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        searchQuery?: string;
        selectedSessionId?: string | null;
      };

      if (typeof parsed.searchQuery === "string") {
        setSearchQuery(parsed.searchQuery);
      }
      pendingSessionIdRef.current = parsed.selectedSessionId || null;
    } catch (error) {
      console.error("Failed to restore admin mock interview state:", error);
    }
  }, [viewStateKey]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        viewStateKey,
        JSON.stringify({
          searchQuery,
          selectedSessionId: selectedSession?.id || null,
        })
      );
    } catch (error) {
      console.error("Failed to persist admin mock interview state:", error);
    }
  }, [viewStateKey, searchQuery, selectedSession?.id]);

  // ── Live stats computed from sessions ─────────────────────────────────────
  const stats = React.useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === "completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : null;
    const totalQs = sessions.reduce((sum, s) => sum + (s.total_questions ?? 0), 0);
    const avgQ = total > 0 ? (totalQs / total).toFixed(1) : null;
    return [
      { label: "Total Interviews", value: loadingSessions ? null : total, Icon: Users, color: "text-cyan-600", bg: "bg-cyan-50" },
      { label: "Avg Questions / Session", value: loadingSessions ? null : avgQ, Icon: BarChart2, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Completion Rate", value: loadingSessions ? null : completionRate != null ? `${completionRate}%` : "—", Icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    ];
  }, [sessions, loadingSessions]);

  // ── Filtered sessions ─────────────────────────────────────────────────────
  const filteredSessions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const name = String(s.user_name || s.user_id || "").toLowerCase();
      const status = String(s.status || "").toLowerCase();
      const date = s.started_at ? new Date(s.started_at).toLocaleString().toLowerCase() : "";
      return name.includes(q) || status.includes(q) || date.includes(q);
    });
  }, [sessions, searchQuery]);

  // ── Fetch sessions ────────────────────────────────────────────────────────
  React.useEffect(() => { fetchSessions(); }, []);

  async function fetchSessions() {
    try {
      setLoadingSessions(true);
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("id, user_id, user_name, started_at, ended_at, status, total_questions")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) { console.error("fetchSessions:", error); setSessions([]); return; }
      setSessions(data || []);
    } catch (err) {
      console.error(err); setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  React.useEffect(() => {
    const pendingSessionId = pendingSessionIdRef.current;
    if (!pendingSessionId || loadingSessions || sessions.length === 0 || selectedSession) return;

    const match = sessions.find((session) => session.id === pendingSessionId) || null;
    if (match) {
      handleViewSession(match);
    }
    pendingSessionIdRef.current = null;
  }, [sessions, loadingSessions, selectedSession]);

  // ── View session ──────────────────────────────────────────────────────────
  async function handleViewSession(session: Session) {
    setSelectedSession(session);
    setLoadingSegments(true);
    setLoadingVideos(true);
    setSegmentsByQuestion({});
    try {
      const { data: segs, error } = await supabase
        .from("interview_recording_segments")
        .select("id, question_id, question_index, segment_order, storage_path, mime_type, transcript_text, whisper_status, metadata, created_at")
        .eq("session_id", session.id)
        .order("question_index", { ascending: true })
        .order("segment_order", { ascending: true });

      if (error) { console.error("fetchSegments:", error); setSegmentsByQuestion({}); setLoadingSegments(false); setLoadingVideos(false); return; }

      const segments = segs || [];

      // Question texts
      const qIds = Array.from(new Set(segments.map((s: any) => s.question_id).filter(Boolean)));
      const questionMap: Record<string, string> = {};
      if (qIds.length > 0) {
        try {
          const { data: qdata } = await supabase
            .from("interview_question_bank")
            .select("id, question_text")
            .in("id", qIds);
          if (qdata) for (const q of qdata) questionMap[String(q.id)] = q.question_text;
        } catch (e) { console.warn("fetchQuestions:", e); }
      }

      // Phase 1: build grouped WITHOUT evaluations → render immediately, keep only final segment per question
      const grouped: Record<string, Segment[]> = {};
      for (const seg of segments) {
        const questionText =
          (seg.metadata?.question_text) ||
          questionMap[String(seg.question_id)] ||
          `Question #${(seg.question_index ?? 0) + 1}`;
        const qk = String(seg.question_index ?? 0);
        if (!grouped[qk]) grouped[qk] = [];
        grouped[qk].push({ ...seg, signedUrl: null, questionText, evaluation: null });
      }
      // Keep only the last segment per question (discard rejected/restarted attempts)
      for (const qk of Object.keys(grouped)) {
        grouped[qk] = [grouped[qk][grouped[qk].length - 1]];
      }

      setSegmentsByQuestion({ ...grouped });
      setLoadingSegments(false);

      // Phase 1b: run evaluations in background (with localStorage cache), update per segment
      const keptSegments = Object.values(grouped).map((segs) => segs[0]).filter(Boolean);
      for (const seg of keptSegments) {
        if (!seg.transcript_text?.trim()) continue;
        const cached = getSegEvalCache(seg.id);
        if (cached) {
          const qk = String(seg.question_index ?? 0);
          grouped[qk] = grouped[qk].map((s) => (s.id === seg.id ? { ...s, evaluation: cached } : s));
          setSegmentsByQuestion({ ...grouped });
          continue;
        }
        const questionText =
          (seg.metadata?.question_text) ||
          questionMap[String(seg.question_id)] ||
          `Question #${(seg.question_index ?? 0) + 1}`;
        try {
          // eslint-disable-next-line no-await-in-loop
          const evaluation = await evaluateAnswer(questionText, seg.transcript_text);
          setSegEvalCache(seg.id, evaluation);
          const qk = String(seg.question_index ?? 0);
          grouped[qk] = grouped[qk].map((s) => (s.id === seg.id ? { ...s, evaluation } : s));
          setSegmentsByQuestion({ ...grouped });
        } catch (e) { console.warn("evaluation:", e); }
      }

      // Phase 2: fetch video URLs in the background and update as each resolves
      const trySignedUrl = async (bucket: string, path: string): Promise<string | null> => {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60);
          if (error) {
            console.warn(`[video] bucket="${bucket}" path="${path}" → ${error.message}`);
            return null;
          }
          return data?.signedUrl ?? (data as any)?.signedURL ?? null;
        } catch (e) {
          console.warn("[video] createSignedUrl threw:", e);
          return null;
        }
      };

      const tryPublicUrl = (bucket: string, path: string): string | null => {
        try {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          return data?.publicUrl ?? null;
        } catch {
          return null;
        }
      };

      for (const seg of keptSegments) {
        if (!seg.storage_path) continue;

        const bucketFromMeta =
          typeof seg.metadata?.storage_bucket === "string"
            ? seg.metadata.storage_bucket
            : typeof seg.metadata?.bucket === "string"
            ? seg.metadata.bucket
            : null;
        const bucketCandidates = Array.from(
          new Set([bucketFromMeta, "interview-recordings"].filter(Boolean) as string[])
        );

        const rawPath = String(seg.storage_path).trim();
        const normalizedPaths = Array.from(
          new Set(
            [
              rawPath,
              rawPath.replace(/^\/+/, ""),
              rawPath.replace(/^interview-recordings\//, ""),
              rawPath.replace(/^\/interview-recordings\//, ""),
            ].filter(Boolean)
          )
        );

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

        if (!signedUrl) {
          console.error(
            `[video] Could not get URL for storage_path="${rawPath}". ` +
              "Check storage bucket policies and whether storage_path includes a bucket prefix."
          );
        }

        const qk = String(seg.question_index ?? 0);
        grouped[qk] = grouped[qk].map((s) => (s.id === seg.id ? { ...s, signedUrl } : s));
        setSegmentsByQuestion({ ...grouped });
      }
    } catch (err) {
      console.error(err); setSegmentsByQuestion({});
    } finally {
      setLoadingSegments(false);
      setLoadingVideos(false);
    }
  }

  function handleCloseModal() {
    setSelectedSession(null);
    setSegmentsByQuestion({});
  }

  // ── Export single session to XLSX ────────────────────────────────────────
  async function handleExportSession(session: Session) {
    setExportingId(session.id);
    try {
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

      // Fetch segments (no signed URL needed — export is text data only)
      const { data: segs, error } = await supabase
        .from("interview_recording_segments")
        .select("id, question_id, question_index, segment_order, transcript_text, whisper_status, metadata, created_at")
        .eq("session_id", session.id)
        .order("question_index", { ascending: true })
        .order("segment_order", { ascending: true });

      if (error || !segs || segs.length === 0) {
        await messageBox.alert({
          title: "No Recordings Found",
          message: "No recorded segments were found for this session.",
          tone: "warning",
        });
        return;
      }

      // Fetch question texts
      const qIds = Array.from(new Set(segs.map((s: any) => s.question_id).filter(Boolean)));
      const questionMap: Record<string, string> = {};
      if (qIds.length > 0) {
        const { data: qdata } = await supabase
          .from("interview_question_bank").select("id, question_text").in("id", qIds);
        if (qdata) for (const q of qdata) questionMap[String(q.id)] = q.question_text;
      }

      // Group segments by question index, merge transcript segments
      const byQ: Record<number, { questionText: string; transcripts: string[]; createdAt: string }> = {};
      for (const seg of segs) {
        const qi: number = seg.question_index ?? 0;
        const qText =
          seg.metadata?.question_text ||
          questionMap[String(seg.question_id)] ||
          `Question #${qi + 1}`;
        if (!byQ[qi]) byQ[qi] = { questionText: qText, transcripts: [], createdAt: seg.created_at };
        if (seg.transcript_text?.trim()) byQ[qi].transcripts.push(seg.transcript_text.trim());
      }

      // Evaluate each question's merged transcript
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
          "Dataset Similarity": evaluation?.datasetSimilarity != null
            ? `${(evaluation.datasetSimilarity * 100).toFixed(0)}%` : "—",
          "Evaluated At": createdAt ? new Date(createdAt).toLocaleString() : "—",
        });
      }

      const overallScore = allScores.length > 0
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
        : "—";

      // ── Sheet 1: Summary ─────────────────────────────────────────────────
      const summaryRows = [
        { Field: "Student Name", Value: session.user_name || session.user_id },
        { Field: "Session ID", Value: session.id },
        { Field: "Status", Value: session.status },
        { Field: "Started At", Value: session.started_at ? new Date(session.started_at).toLocaleString() : "—" },
        { Field: "Ended At", Value: session.ended_at ? new Date(session.ended_at).toLocaleString() : "—" },
        { Field: "Total Questions", Value: String(session.total_questions ?? questionRows.length) },
        { Field: "Overall Avg Score (1–5)", Value: overallScore },
        { Field: "Note", Value: "Excel will automatically expand rows when you click Wrap Text." },
      ];

      const wbSummary = XLSX.utils.json_to_sheet(summaryRows, { skipHeader: false });
      wbSummary["!cols"] = [{ wch: 28 }, { wch: 60 }];

      // ── Sheet 2: Question Details ─────────────────────────────────────────
      const wbDetail = XLSX.utils.json_to_sheet(questionRows);

      // Column widths
      wbDetail["!cols"] = [
        { wch: 4 },
        { wch: 45 },
        { wch: 60 },
        { wch: 12 },
        { wch: 30 },
        { wch: 11 },
        { wch: 8 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 22 }
      ];

      // Apply alignment + wrapping to all cells
      const range = XLSX.utils.decode_range(wbDetail["!ref"]);

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

          if (!wbDetail[cellAddress]) continue;

          wbDetail[cellAddress].s = {
            alignment: {
              horizontal: "center",
              vertical: "center",
              wrapText: true
            },
            font: R === 0 ? { bold: true } : {}
          };
        }
      }
      
      // Build workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wbSummary, "Summary");
      XLSX.utils.book_append_sheet(wb, wbDetail, "Question Details");

      const studentSlug = (session.user_name || "student").replace(/\s+/g, "_").toLowerCase();
      const dateSlug = session.started_at
        ? new Date(session.started_at).toISOString().slice(0, 10)
        : "unknown";
      const filename = `interview_${studentSlug}_${dateSlug}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export failed:", err);
      await messageBox.alert({
        title: "Export Failed",
        message: "Export failed. Please try again.",
        tone: "error",
      });
    } finally {
      setExportingId(null);
    }
  }

  async function handleLogout() {
    try { await signOut(); } catch (e) { console.error(e); } finally { navigate("/login"); }
  }
  function handleNavigate(route: string) { navigate(`/${route}`); }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
        <AdminNavbar userName={userName} userID={userID} onLogout={handleLogout} onNavigate={handleNavigate} activeNav="admin/mock_interview" />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <div className="absolute left-0 top-0 bottom-0">
              <AdminNavbar userName={userName} userID={userID}
                onLogout={() => { setMobileOpen(false); handleLogout(); }}
                onNavigate={(r) => { setMobileOpen(false); handleNavigate(r); }}
                activeNav="admin/mock_interview" />
            </div>
            <button aria-label="Close sidebar" className="absolute top-4 right-4 p-2 rounded-md bg-white/90" onClick={() => setMobileOpen(false)}>
              <X className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="md:ml-72">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center px-6 py-4">
            <button aria-label="Open navigation menu" onClick={() => setMobileOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Mock Interviews</h1>
            <p className="text-gray-500 mt-1">View interview results and recordings</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-xl ${bg}`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {value == null ? <span className="text-gray-300 animate-pulse">—</span> : value}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sessions table */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Interviews</h3>
              <div className="relative w-full sm:max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input aria-label="Search interviews" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student, status, date..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    {["Student", "Date", "Questions", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingSessions ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">Loading sessions...</td></tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                      {sessions.length === 0 ? "No interview sessions yet." : "No sessions match your search."}
                    </td></tr>
                  ) : (
                    filteredSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{session.user_name || session.user_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{session.started_at ? new Date(session.started_at).toLocaleString() : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{session.total_questions ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClass(session.status)}`}>{session.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleViewSession(session)} className="inline-flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                              <Eye className="w-4 h-4" />View
                            </button>
                            
                          </div>
                        </td>
                        <td>
                          <button
                              onClick={() => handleExportSession(session)}
                              disabled={exportingId === session.id}
                              className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Export session to Excel"
                            >
                              {exportingId === session.id
                                ? <><Loader2 className="w-4 h-4 animate-spin" />Exporting…</>
                                : <><Download className="w-4 h-4" />Export</>}
                            </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedSession.user_name || selectedSession.user_id}
                  {selectedSession.started_at ? ` — ${new Date(selectedSession.started_at).toLocaleString()}` : ""}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClass(selectedSession.status)}`}>
                    {selectedSession.status}
                  </span>
                  {selectedSession.total_questions != null && (
                    <span className="text-xs text-gray-400">
                      {selectedSession.total_questions} question{selectedSession.total_questions !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <button aria-label="Close dialog" onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {loadingSegments ? (
                <div className="text-center py-16 text-gray-400">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 opacity-40 animate-spin" />
                  <p>Loading questions and evaluations…</p>
                  <p className="text-xs mt-1 text-gray-300">This may take a moment</p>
                </div>
              ) : Object.keys(segmentsByQuestion).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Video className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>No recorded segments for this session.</p>
                </div>
              ) : (
                Object.keys(segmentsByQuestion)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((qIdx) => (
                    <QuestionCard key={qIdx} qIdx={qIdx} segments={segmentsByQuestion[qIdx]} loadingVideos={loadingVideos} />
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

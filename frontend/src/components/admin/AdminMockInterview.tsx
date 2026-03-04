import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import {
  X,
  Bell,
  Eye,
  Video,
  Play,
  Menu,
  Search,
} from "lucide-react";
import { supabase } from '../../lib/supabaseClient'
import evaluateAnswer from '../../utils/robertaEvaluator'

export default function AdminMockInterview() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const userName = user?.email?.split("@")[0] || "";
  const userID = user?.id ?? "";

  const stats = [
    { label: "Total Interviews", value: null },
    { label: "Avg Score (1-5)", value: null },
    { label: "Completion Rate", value: null },
  ];

  const recentInterviews: Array<{
    student: string;
    date: string;
    questions: number;
    score: number;
  }> = [];

  const [sessions, setSessions] = React.useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = React.useState<boolean>(true)
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [selectedSession, setSelectedSession] = React.useState<any | null>(null)
  const [segmentsByQuestion, setSegmentsByQuestion] = React.useState<Record<string, any[]>>({})
  const [loadingSegments, setLoadingSegments] = React.useState<boolean>(false)

  const filteredSessions = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sessions

    return sessions.filter((session) => {
      const student = String(session.user_name || session.user_id || "").toLowerCase()
      const status = String(session.status || "").toLowerCase()
      const questions = String(session.total_questions ?? "").toLowerCase()
      const date = session.started_at ? new Date(session.started_at).toLocaleString().toLowerCase() : ""

      return (
        student.includes(query) ||
        status.includes(query) ||
        questions.includes(query) ||
        date.includes(query)
      )
    })
  }, [sessions, searchQuery])

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

  React.useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      setLoadingSessions(true)
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('id, user_id, user_name, started_at, ended_at, status, total_questions')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching interview sessions:', error)
        setSessions([])
        return
      }

      setSessions(data || [])
    } catch (err) {
      console.error('Unexpected error fetching sessions', err)
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  async function handleViewSession(session: any) {
    setSelectedSession(session)
    setLoadingSegments(true)
    try {
      const { data: segs, error } = await supabase
        .from('interview_recording_segments')
        .select('id, question_id, question_index, segment_order, storage_path, transcript_text, whisper_status, metadata, created_at')
        .eq('session_id', session.id)
        .order('question_index', { ascending: true })
        .order('segment_order', { ascending: true })

      if (error) {
        console.error('Error fetching segments:', error)
        setSegmentsByQuestion({})
        return
      }

      const segments = segs || []
      // collect question ids to fetch question text
      const qIds = Array.from(new Set(segments.map((s:any) => s.question_id).filter(Boolean)))
      let questionMap: Record<string,string> = {}
      if (qIds.length > 0) {
        try {
          const { data: qdata } = await supabase
            .from('interview_question_bank')
            .select('id, question_text')
            .in('id', qIds)
          if (qdata) {
            for (const q of qdata) questionMap[String(q.id)] = q.question_text
          }
        } catch (e) {
          console.warn('Failed to fetch question texts', e)
        }
      }
      const grouped: Record<string, any[]> = {}
      for (const seg of segments) {
        // generate signed url for video if storage_path exists
        let signedUrl = null
        if (seg.storage_path) {
          try {
            const { data: urlData, error: urlErr } = await supabase.storage
              .from('interview-recordings')
              .createSignedUrl(seg.storage_path, 60 * 60)
            if (!urlErr && urlData?.signedURL) signedUrl = urlData.signedURL
          } catch (e) {
            console.warn('createSignedUrl failed', e)
          }
        }

        // Determine question text (prefer metadata, then question bank)
        const questionText = (seg.metadata && seg.metadata.question_text) || questionMap[String(seg.question_id)] || `Question #${(seg.question_index ?? 0) + 1}`

        // Attach evaluation if transcript exists. Use evaluator fallback if HF token missing.
        let evaluation = null
        try {
          if (seg.transcript_text && typeof seg.transcript_text === 'string' && seg.transcript_text.trim().length > 0) {
            // Evaluate answer (may call HF RoBERTa or fallback locally)
            // Note: this can be slow if many segments; acceptable for admin inspection.
            // eslint-disable-next-line no-await-in-loop
            evaluation = await evaluateAnswer(questionText, seg.transcript_text)
          }
        } catch (e) {
          console.warn('Evaluation failed for segment', seg.id, e)
          evaluation = { error: String(e) }
        }

        const qk = String(seg.question_index ?? 0)
        if (!grouped[qk]) grouped[qk] = []
        grouped[qk].push({ ...seg, signedUrl, questionText, evaluation })
      }

      setSegmentsByQuestion(grouped)
    } catch (err) {
      console.error('Unexpected error fetching session segments', err)
      setSegmentsByQuestion({})
    } finally {
      setLoadingSegments(false)
    }
  }

  function handleCloseSessionModal() {
    setSelectedSession(null)
    setSegmentsByQuestion({})
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (hidden on small screens) - Fixed position */}
      <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="admin/mock_interview"
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <div className="absolute left-0 top-0 bottom-0">
              <AdminNavbar
                userName={userName}
                userID={userID}
                onLogout={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                onNavigate={(r) => {
                  setMobileOpen(false);
                  handleNavigate(r);
                }}
                activeNav="admin/mock_interview"
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
      <div className="md:ml-72">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Mock Interviews</h1>
              <p className="text-gray-500 mt-1">View interview results</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="text-3xl font-semibold text-gray-900 mb-1">
                    {item.value ?? "—"}
                  </div>
                  <div className="text-sm text-gray-600">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Interviews Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Interviews</h3>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student, status, date..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Questions</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingSessions ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                          Loading sessions...
                        </td>
                      </tr>
                    ) : sessions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                          No interview sessions yet.
                        </td>
                      </tr>
                    ) : filteredSessions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                          No sessions match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{session.user_name || session.user_id}</td>
                          <td className="px-4 py-3 text-gray-600">{session.started_at ? new Date(session.started_at).toLocaleString() : '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{session.total_questions ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{session.status}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleViewSession(session)} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
        {/* Session Details Modal */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                  <p className="text-sm text-gray-600">{selectedSession.user_name || selectedSession.user_id} — {selectedSession.started_at ? new Date(selectedSession.started_at).toLocaleString() : ''}</p>
                  {/* notify admin about evaluation availability */}
                  {Object.values(segmentsByQuestion).flat().some(s => s.evaluation) ? (
                    <p className="text-sm text-green-600 mt-1">
                      This session includes <strong>detailed evaluation per answer</strong> (STAR breakdown and score).
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-600 mt-1">
                      No evaluation data is available for this session.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCloseSessionModal} className="px-4 py-2 bg-white border border-gray-300 rounded-md">Close</button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {loadingSegments ? (
                  <div className="text-center py-12 text-gray-500">Loading segments...</div>
                ) : Object.keys(segmentsByQuestion).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No recorded segments for this session.</div>
                ) : (
                  Object.keys(segmentsByQuestion).sort((a,b)=>Number(a)-Number(b)).map((qIdx) => (
                    <div key={qIdx} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Question #{Number(qIdx) + 1}</h3>
                      <div className="space-y-3">
                        {segmentsByQuestion[qIdx].map((seg) => (
                          <div key={seg.id} className="p-3 bg-white border rounded-lg">
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1">
                                {seg.signedUrl ? (
                                  <video controls className="w-full h-48 bg-black rounded">
                                    <source src={seg.signedUrl} type={seg.mime_type || 'video/webm'} />
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">No video</div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm text-gray-600 mb-2">Transcript</div>
                                <div className="p-3 bg-gray-50 rounded min-h-[80px] text-sm text-gray-800">{seg.transcript_text || '—'}</div>
                                <div className="mt-3">
                                  <div className="text-sm text-gray-600 mb-1">Evaluation</div>
                                  {seg.evaluation ? (
                                    <div className="p-3 bg-gray-50 rounded">
                                      <div className="text-sm font-medium text-gray-800">Score: <span className="font-semibold">{seg.evaluation.score ?? '—'}</span> <span className="text-xs text-gray-500">{seg.evaluation.hrLabel ? `(${seg.evaluation.hrLabel})` : ''}</span></div>
                                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                                        <div><strong>Situation:</strong> {seg.evaluation.breakdown?.situation ?? '—'}</div>
                                        <div><strong>Task:</strong> {seg.evaluation.breakdown?.task ?? '—'}</div>
                                        <div><strong>Action:</strong> {seg.evaluation.breakdown?.action ?? '—'}</div>
                                        <div><strong>Result:</strong> {seg.evaluation.breakdown?.result ?? '—'}</div>
                                        <div className="sm:col-span-2"><strong>Reflection:</strong> {seg.evaluation.breakdown?.reflection ?? '—'}</div>
                                      </div>
                                      {/* source field intentionally omitted from UI */}
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-2">No evaluation available for this segment.</div>
                                      <div className="text-sm text-gray-600 mb-1">Metadata</div>
                                      <pre className="p-2 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">{JSON.stringify(seg.metadata || {}, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        </div>
  );
}

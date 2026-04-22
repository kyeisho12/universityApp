import { supabase } from "../lib/supabaseClient";

function isMissingEventRegistrationsTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  const hint = String(error.hint || "").toLowerCase();

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("event_registrations") ||
    details.includes("event_registrations") ||
    hint.includes("event_registrations")
  );
}

export type MonthlyTrendPoint = { month: string; interviews: number; applications: number; events: number };
export type CountPoint = { label: string; count: number };
export type EventPoint = { id: string; title: string; eventType: string; registrations: number };
export type TopStudentPoint = { userId: string; userName: string; interviewCount: number; avgScore: number | null };
export type ScoreTrendPoint = { month: string; avgScore: number | null; count: number };

export type StudentAnalyticsData = {
  activeStudents: number;
  interviews: number;
  avgScore: number;
  events: number;
  completionRate: number;
  inactiveStudentCount: number;
  monthlyTrends: MonthlyTrendPoint[];
  scoreDistribution: CountPoint[];
  scoreTrend: ScoreTrendPoint[];
  sessionStatusBreakdown: CountPoint[];
  engagementFunnel: { totalStudents: number; withInterview: number; withApplication: number };
  topStudents: TopStudentPoint[];
  topEvents: EventPoint[];
};


type ProfileRow = {
  id: string;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  ended_at: string | null;
};

type ApplicationRow = {
  id: string;
  student_id: string | null;
  status: string | null;
  created_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  event_type: string | null;
  date: string | null;
  created_at: string | null;
};

type RegistrationRow = {
  event_id: string | null;
  registered_at: string | null;
};

export async function fetchStudentAnalyticsData(): Promise<StudentAnalyticsData> {
  const [profilesRes, sessionsRes, applicationsRes, eventsRes, registrationsRes] = await Promise.all([
    supabase.from("profiles").select("id, role, is_active, created_at"),
    supabase.from("interview_sessions").select("id, user_id, user_name, status, metadata, created_at, ended_at"),
    supabase.from("applications").select("id, student_id, status, created_at"),
    supabase.from("career_events").select("id, title, event_type, date, created_at"),
    supabase.from("event_registrations").select("event_id, registered_at"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (applicationsRes.error) throw applicationsRes.error;
  if (eventsRes.error) throw eventsRes.error;
  if (registrationsRes.error && !isMissingEventRegistrationsTableError(registrationsRes.error)) {
    throw registrationsRes.error;
  }

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const applications = (applicationsRes.data ?? []) as ApplicationRow[];
  const events = (eventsRes.data ?? []) as EventRow[];
  const registrations = (registrationsRes.data ?? []) as RegistrationRow[];

  const students = profiles.filter((p) => p.role === "student");
  const activeStudents = students.filter((p) => Boolean(p.is_active)).length;

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const scoredSessions = completedSessions
    .map((s) => getSessionScore(s.metadata))
    .filter((score): score is number => typeof score === "number");

  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce((sum, score) => sum + score, 0) / scoredSessions.length
      : 0;

  const monthMeta = getLastMonths(6);
  const monthlyTrendMap = new Map(
    monthMeta.map((item) => [item.key, { month: item.label, interviews: 0, applications: 0, events: 0 }])
  );
  const scoreTrendMap = new Map(
    monthMeta.map((item) => [item.key, { month: item.label, scores: [] as number[], count: 0 }])
  );

  completedSessions.forEach((session) => {
    const key = toMonthKey(session.ended_at || session.created_at);
    if (!key) return;
    if (monthlyTrendMap.has(key)) monthlyTrendMap.get(key)!.interviews += 1;
    const score = getSessionScore(session.metadata);
    if (scoreTrendMap.has(key) && score !== null) {
      scoreTrendMap.get(key)!.scores.push(score);
      scoreTrendMap.get(key)!.count += 1;
    }
  });

  applications.forEach((app) => {
    const key = toMonthKey(app.created_at);
    if (!key || !monthlyTrendMap.has(key)) return;
    monthlyTrendMap.get(key)!.applications += 1;
  });

  events.forEach((event) => {
    const key = toMonthKey(event.date || event.created_at);
    if (!key || !monthlyTrendMap.has(key)) return;
    monthlyTrendMap.get(key)!.events += 1;
  });

  const scoreTrend: ScoreTrendPoint[] = monthMeta.map((item) => {
    const d = scoreTrendMap.get(item.key)!;
    const avg = d.scores.length > 0 ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : null;
    return { month: item.label, avgScore: avg, count: d.count };
  });

  const scoreBuckets = [0, 0, 0, 0, 0];
  scoredSessions.forEach((score) => {
    const normalized = Math.max(0, Math.min(4.999, score));
    scoreBuckets[Math.floor(normalized)] += 1;
  });

  const scoreDistribution: CountPoint[] = [
    { label: "0-1", count: scoreBuckets[0] },
    { label: "1-2", count: scoreBuckets[1] },
    { label: "2-3", count: scoreBuckets[2] },
    { label: "3-4", count: scoreBuckets[3] },
    { label: "4-5", count: scoreBuckets[4] },
  ];

  // Session status breakdown
  const statusCounts = { completed: 0, voided: 0, in_progress: 0 };
  sessions.forEach((s) => {
    const st = String(s.status || "").toLowerCase();
    if (st === "completed") statusCounts.completed++;
    else if (st === "voided") statusCounts.voided++;
    else statusCounts.in_progress++;
  });
  const sessionStatusBreakdown: CountPoint[] = [
    { label: "Completed", count: statusCounts.completed },
    { label: "In Progress", count: statusCounts.in_progress },
    { label: "Voided", count: statusCounts.voided },
  ].filter((item) => item.count > 0);

  const completionRate =
    sessions.length > 0 ? Math.round((statusCounts.completed / sessions.length) * 100) : 0;

  // Engagement funnel
  const studentsWithInterview = new Set(completedSessions.map((s) => s.user_id));
  const studentsWithApplication = new Set(
    applications.map((a) => a.student_id).filter(Boolean) as string[]
  );
  const engagementFunnel = {
    totalStudents: students.length,
    withInterview: studentsWithInterview.size,
    withApplication: studentsWithApplication.size,
  };

  // Inactive students (no completed interview AND no application)
  const activeStudentIds = new Set([...studentsWithInterview, ...studentsWithApplication]);
  const inactiveStudentCount = students.filter((s) => !activeStudentIds.has(s.id)).length;

  // Top students by avg score
  const studentSessionMap = new Map<string, { userName: string; scores: number[]; count: number }>();
  completedSessions.forEach((s) => {
    if (!studentSessionMap.has(s.user_id)) {
      studentSessionMap.set(s.user_id, { userName: s.user_name || s.user_id, scores: [], count: 0 });
    }
    const entry = studentSessionMap.get(s.user_id)!;
    entry.count++;
    const score = getSessionScore(s.metadata);
    if (score !== null) entry.scores.push(score);
  });
  const topStudents: TopStudentPoint[] = Array.from(studentSessionMap.entries())
    .map(([userId, data]) => ({
      userId,
      userName: data.userName,
      interviewCount: data.count,
      avgScore: data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : null,
    }))
    .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))
    .slice(0, 10);

  // Top events
  const registrationCountByEvent = new Map<string, number>();
  registrations.forEach((reg) => {
    const eventId = String(reg.event_id || "");
    if (!eventId) return;
    registrationCountByEvent.set(eventId, (registrationCountByEvent.get(eventId) || 0) + 1);
  });

  const topEvents: EventPoint[] = events
    .map((event) => ({
      id: event.id,
      title: event.title,
      eventType: String(event.event_type || "Other"),
      registrations: registrationCountByEvent.get(event.id) || 0,
    }))
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, 6);

  return {
    activeStudents,
    interviews: completedSessions.length,
    avgScore,
    events: events.length,
    completionRate,
    inactiveStudentCount,
    monthlyTrends: monthMeta.map((item) => monthlyTrendMap.get(item.key)!),
    scoreDistribution,
    scoreTrend,
    sessionStatusBreakdown,
    engagementFunnel,
    topStudents,
    topEvents,
  };
}

function getSessionScore(metadata: Record<string, unknown> | null): number | null {
  const summary = (metadata?.score_summary || null) as Record<string, unknown> | null;
  const candidates = [
    Number(summary?.overall_average),
    Number(summary?.average_score),
    Number(metadata?.session_score),
  ];
  for (const value of candidates) {
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function toMonthKey(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function getLastMonths(count: number): { key: string; label: string }[] {
  const now = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    out.push({ key, label });
  }
  return out;
}

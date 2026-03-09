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

export type MonthlyTrendPoint = { month: string; interviews: number; applications: number };
export type ActivityTrendPoint = { month: string; newStudents: number; registrations: number };
export type CountPoint = { label: string; count: number };
export type EventPoint = { id: string; title: string; eventType: string; registrations: number };

export type StudentAnalyticsData = {
  activeStudents: number;
  interviews: number;
  avgScore: number;
  events: number;
  monthlyTrends: MonthlyTrendPoint[];
  scoreDistribution: CountPoint[];
  monthlyActivityTrends: ActivityTrendPoint[];
  applicationStatus: CountPoint[];
  eventsByType: CountPoint[];
  topEvents: EventPoint[];
};

const STATUS_ORDER = ["pending", "accepted", "rejected", "withdrawn"];

const EMPTY_DATA: StudentAnalyticsData = {
  activeStudents: 0,
  interviews: 0,
  avgScore: 0,
  events: 0,
  monthlyTrends: [],
  scoreDistribution: [],
  monthlyActivityTrends: [],
  applicationStatus: [],
  eventsByType: [],
  topEvents: [],
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
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  ended_at: string | null;
};

type ApplicationRow = {
  id: string;
  status: string | null;
  created_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  event_type: string | null;
  created_at: string | null;
};

type RegistrationRow = {
  event_id: string | null;
  registered_at: string | null;
};

export async function fetchStudentAnalyticsData(): Promise<StudentAnalyticsData> {
  const [profilesRes, sessionsRes, applicationsRes, eventsRes, registrationsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, is_active, created_at"),
    supabase
      .from("interview_sessions")
      .select("id, user_id, status, metadata, created_at, ended_at"),
    supabase
      .from("applications")
      .select("id, status, created_at"),
    supabase
      .from("career_events")
      .select("id, title, event_type, created_at"),
    supabase
      .from("event_registrations")
      .select("event_id, registered_at"),
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
    monthMeta.map((item) => [item.key, { month: item.label, interviews: 0, applications: 0 }])
  );
  const activityMap = new Map(
    monthMeta.map((item) => [item.key, { month: item.label, newStudents: 0, registrations: 0 }])
  );

  completedSessions.forEach((session) => {
    const key = toMonthKey(session.ended_at || session.created_at);
    if (!key || !monthlyTrendMap.has(key)) return;
    monthlyTrendMap.get(key)!.interviews += 1;
  });

  applications.forEach((app) => {
    const key = toMonthKey(app.created_at);
    if (!key || !monthlyTrendMap.has(key)) return;
    monthlyTrendMap.get(key)!.applications += 1;
  });

  students.forEach((student) => {
    const key = toMonthKey(student.created_at);
    if (!key || !activityMap.has(key)) return;
    activityMap.get(key)!.newStudents += 1;
  });

  registrations.forEach((reg) => {
    const key = toMonthKey(reg.registered_at);
    if (!key || !activityMap.has(key)) return;
    activityMap.get(key)!.registrations += 1;
  });

  const scoreBuckets = [0, 0, 0, 0, 0];
  scoredSessions.forEach((score) => {
    const normalized = Math.max(0, Math.min(4.999, score));
    const index = Math.floor(normalized);
    scoreBuckets[index] += 1;
  });

  const scoreDistribution: CountPoint[] = [
    { label: "0-1", count: scoreBuckets[0] },
    { label: "1-2", count: scoreBuckets[1] },
    { label: "2-3", count: scoreBuckets[2] },
    { label: "3-4", count: scoreBuckets[3] },
    { label: "4-5", count: scoreBuckets[4] },
  ];

  const statusMap = new Map<string, number>();
  STATUS_ORDER.forEach((status) => statusMap.set(status, 0));

  applications.forEach((app) => {
    const status = String(app.status || "unknown").toLowerCase();
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  const unknownStatuses = Array.from(statusMap.keys()).filter((status) => !STATUS_ORDER.includes(status));
  const applicationStatus: CountPoint[] = [
    ...STATUS_ORDER.map((status) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      count: statusMap.get(status) || 0,
    })),
    ...unknownStatuses.map((status) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      count: statusMap.get(status) || 0,
    })),
  ].filter((item) => item.count > 0);

  const eventTypeMap = new Map<string, number>();
  events.forEach((event) => {
    const type = String(event.event_type || "Other");
    eventTypeMap.set(type, (eventTypeMap.get(type) || 0) + 1);
  });

  const eventsByType = Array.from(eventTypeMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

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
    ...EMPTY_DATA,
    activeStudents,
    interviews: completedSessions.length,
    avgScore,
    events: events.length,
    monthlyTrends: monthMeta.map((item) => monthlyTrendMap.get(item.key)!),
    scoreDistribution,
    monthlyActivityTrends: monthMeta.map((item) => activityMap.get(item.key)!),
    applicationStatus,
    eventsByType,
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

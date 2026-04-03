import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import {
    fetchStudentAnalyticsData,
    type MonthlyTrendPoint,
    type CountPoint,
    type EventPoint,
    type TopStudentPoint,
    type ScoreTrendPoint,
} from "../../services/studentAnalyticsService";
import {
    X,
    Users,
    ClipboardList,
    TrendingUp,
    Calendar,
    Menu,
    Award,
    UserX,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Score color helpers
// ---------------------------------------------------------------------------
function scoreColor(score: number | null) {
    if (score == null) return { bar: "#d1d5db", text: "text-gray-500" };
    if (score >= 4) return { bar: "#10b981", text: "text-emerald-600" };
    if (score >= 3) return { bar: "#06b6d4", text: "text-cyan-600" };
    if (score >= 2) return { bar: "#f59e0b", text: "text-yellow-600" };
    return { bar: "#ef4444", text: "text-red-500" };
}

// ---------------------------------------------------------------------------
// Interactive bar chart (Monthly Trends)
// ---------------------------------------------------------------------------
function InteractiveBarChart({
    data,
    leftKey,
    rightKey,
    leftLabel,
    rightLabel,
}: {
    data: MonthlyTrendPoint[];
    leftKey: keyof MonthlyTrendPoint;
    rightKey: keyof MonthlyTrendPoint;
    leftLabel: string;
    rightLabel: string;
}) {
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
    const [showLeft, setShowLeft] = React.useState(true);
    const [showRight, setShowRight] = React.useState(true);

    if (!data || data.length === 0) return <EmptyChartState />;

    const max = Math.max(
        ...data.map((d) =>
            Math.max(
                showLeft ? (Number(d[leftKey]) || 0) : 0,
                showRight ? (Number(d[rightKey]) || 0) : 0
            )
        ),
        1
    );

    return (
        <div className="h-64 flex flex-col gap-3">
            {/* Legend — clickable toggles */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
                <button
                    type="button"
                    onClick={() => setShowLeft((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${showLeft ? "border-[#1B2744] bg-[#1B2744]/10" : "border-gray-200 opacity-40"}`}
                >
                    <span className="w-2.5 h-2.5 rounded bg-[#1B2744]" />
                    {leftLabel}
                </button>
                <button
                    type="button"
                    onClick={() => setShowRight((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${showRight ? "border-[#00B4D8] bg-[#00B4D8]/10" : "border-gray-200 opacity-40"}`}
                >
                    <span className="w-2.5 h-2.5 rounded bg-[#00B4D8]" />
                    {rightLabel}
                </button>
            </div>

            {/* Bars */}
            <div className="flex-1 grid gap-2 items-end" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
                {data.map((item, i) => {
                    const lv = Number(item[leftKey]) || 0;
                    const rv = Number(item[rightKey]) || 0;
                    const lh = showLeft ? (lv / max) * 100 : 0;
                    const rh = showRight ? (rv / max) * 100 : 0;
                    const isHovered = hoveredIdx === i;
                    return (
                        <div
                            key={item.month}
                            className="relative flex flex-col items-center gap-1"
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            {/* Tooltip */}
                            {isHovered && (
                                <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                    <p className="font-semibold text-gray-300 mb-1">{item.month}</p>
                                    {showLeft && <p>{leftLabel}: <span className="font-bold text-white">{lv}</span></p>}
                                    {showRight && <p>{rightLabel}: <span className="font-bold text-white">{rv}</span></p>}
                                    {/* Arrow */}
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                </div>
                            )}
                            {/* Bar pair */}
                            <div
                                className={`h-44 w-full flex items-end justify-center gap-0.5 rounded-t transition-all ${isHovered ? "opacity-100" : "opacity-90"}`}
                            >
                                <div
                                    className="rounded-t transition-all duration-500"
                                    style={{
                                        width: "42%",
                                        height: `${lh}%`,
                                        minHeight: lv > 0 ? "4px" : "0",
                                        background: isHovered ? "#0f1a33" : "#1B2744",
                                    }}
                                />
                                <div
                                    className="rounded-t transition-all duration-500"
                                    style={{
                                        width: "42%",
                                        height: `${rh}%`,
                                        minHeight: rv > 0 ? "4px" : "0",
                                        background: isHovered ? "#00d4ff" : "#00B4D8",
                                    }}
                                />
                            </div>
                            <span className="text-xs text-gray-500">{item.month}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Donut chart (Session Status)
// ---------------------------------------------------------------------------
const DONUT_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1", "#00B4D8"];

function DonutChart({ data }: { data: CountPoint[] }) {
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    if (!data || data.length === 0) return <EmptyChartState />;

    const r = 58;
    const cx = 75;
    const cy = 75;
    const sw = 22;
    const C = 2 * Math.PI * r;
    const total = data.reduce((s, d) => s + d.count, 0);

    let cum = 0;
    const segments = data.map((d, i) => {
        const dash = total > 0 ? (d.count / total) * C : 0;
        const seg = { ...d, dash, cum, pct: total > 0 ? d.count / total : 0, color: DONUT_COLORS[i % DONUT_COLORS.length] };
        cum += dash;
        return seg;
    });

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6">
            <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0">
                {/* Track */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
                {segments.map((seg, i) => (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={hoveredIdx === i ? sw + 5 : sw}
                        strokeDasharray={`${seg.dash} ${C - seg.dash}`}
                        strokeDashoffset={-seg.cum}
                        transform={`rotate(-90, ${cx}, ${cy})`}
                        style={{ cursor: "pointer", transition: "stroke-width 0.15s" }}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    />
                ))}
                {/* Center label */}
                <text x={cx} y={cy - 6} textAnchor="middle" fill="#111827" fontSize="22" fontWeight="700">
                    {total}
                </text>
                <text x={cx} y={cy + 13} textAnchor="middle" fill="#6b7280" fontSize="11">
                    total
                </text>
            </svg>

            {/* Legend */}
            <div className="space-y-2 w-full">
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${hoveredIdx === i ? "bg-gray-100" : ""}`}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} />
                        <span className="text-gray-700 flex-1">{seg.label}</span>
                        <span className="font-semibold text-gray-900">{seg.count}</span>
                        <span className="text-gray-400 text-xs w-10 text-right">{Math.round(seg.pct * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Score trend chart
// ---------------------------------------------------------------------------
function ScoreTrendChart({ data }: { data: ScoreTrendPoint[] }) {
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    if (!data || data.length === 0) return <EmptyChartState />;

    const max = 5;

    return (
        <div className="h-64 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Avg score / month (0–5)</span>
                <span className="text-gray-400 italic">hover for details</span>
            </div>
            <div className="flex-1 grid gap-2 items-end" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
                {data.map((item, i) => {
                    const h = item.avgScore != null ? (item.avgScore / max) * 100 : 0;
                    const { bar } = scoreColor(item.avgScore);
                    const isHovered = hoveredIdx === i;
                    return (
                        <div
                            key={item.month}
                            className="relative flex flex-col items-center gap-1"
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            {isHovered && (
                                <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                    <p className="font-semibold text-gray-300 mb-1">{item.month}</p>
                                    {item.avgScore != null
                                        ? <p>Avg: <span className="font-bold">{item.avgScore.toFixed(2)}</span> / 5</p>
                                        : <p className="text-gray-400">No data</p>}
                                    <p>{item.count} interview{item.count !== 1 ? "s" : ""}</p>
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                </div>
                            )}
                            <div className="h-44 w-full flex items-end justify-center">
                                <div
                                    className="w-3/4 rounded-t transition-all duration-500"
                                    style={{
                                        height: `${h}%`,
                                        minHeight: item.avgScore != null ? "4px" : "0",
                                        background: bar,
                                        opacity: isHovered ? 1 : 0.8,
                                    }}
                                />
                            </div>
                            <span className="text-xs text-gray-500">{item.month}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Interactive horizontal bar chart (Score Distribution)
// ---------------------------------------------------------------------------
function InteractiveHorizontalBar({ data }: { data: CountPoint[] }) {
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    if (!data || data.length === 0) return <EmptyChartState />;

    const max = Math.max(...data.map((d) => d.count), 1);
    const SCORE_COLORS = ["#ef4444", "#f59e0b", "#f59e0b", "#06b6d4", "#10b981"];

    return (
        <div className="space-y-3 py-2">
            {data.map((item, i) => {
                const width = (item.count / max) * 100;
                const isHovered = hoveredIdx === i;
                return (
                    <div
                        key={item.label}
                        className={`px-3 py-2 rounded-lg transition-colors cursor-default ${isHovered ? "bg-gray-50" : ""}`}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-medium text-gray-700">{item.label}</span>
                            <span className={`font-semibold transition-all ${isHovered ? "text-gray-900 scale-110" : "text-gray-600"}`}>
                                {item.count}
                            </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${width}%`,
                                    background: SCORE_COLORS[i] ?? "#00B4D8",
                                    opacity: isHovered ? 1 : 0.75,
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Student Engagement Funnel
// ---------------------------------------------------------------------------
function FunnelChart({ data }: { data: { totalStudents: number; withInterview: number; withApplication: number } }) {
    const stages = [
        { label: "Registered Students", count: data.totalStudents, pct: 100, color: "#1B2744" },
        {
            label: "Did an Interview",
            count: data.withInterview,
            pct: data.totalStudents > 0 ? Math.round((data.withInterview / data.totalStudents) * 100) : 0,
            color: "#00B4D8",
        },
        {
            label: "Applied to a Job",
            count: data.withApplication,
            pct: data.totalStudents > 0 ? Math.round((data.withApplication / data.totalStudents) * 100) : 0,
            color: "#10b981",
        },
    ];

    return (
        <div className="space-y-4 py-2">
            {stages.map((stage, i) => (
                <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: stage.color }}>
                                {i + 1}
                            </span>
                            <span className="font-medium text-gray-700">{stage.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900">{stage.count}</span>
                            <span className="text-xs text-gray-400 w-10 text-right">{stage.pct}%</span>
                        </div>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${stage.pct}%`, background: stage.color }}
                        />
                    </div>
                    {i < stages.length - 1 && (
                        <p className="text-xs text-gray-400 pl-7">
                            {stages[i + 1].count} of {stage.count} moved to next stage
                            {stage.count > 0 ? ` (${Math.round((stages[i + 1].count / stage.count) * 100)}%)` : ""}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Top Students Leaderboard
// ---------------------------------------------------------------------------
type SortKey = "avgScore" | "interviewCount";

function LeaderboardTable({ data }: { data: TopStudentPoint[] }) {
    const [sortKey, setSortKey] = React.useState<SortKey>("avgScore");
    const [sortDir, setSortDir] = React.useState<"desc" | "asc">("desc");
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    if (!data || data.length === 0) return <EmptyChartState />;

    const sorted = [...data].sort((a, b) => {
        const av = sortKey === "avgScore" ? (a.avgScore ?? -1) : a.interviewCount;
        const bv = sortKey === "avgScore" ? (b.avgScore ?? -1) : b.interviewCount;
        return sortDir === "desc" ? bv - av : av - bv;
    });

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else { setSortKey(key); setSortDir("desc"); }
    }

    function SortIcon({ col }: { col: SortKey }) {
        if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-gray-400" />;
        return sortDir === "desc"
            ? <ChevronDown className="w-3 h-3 text-[#00B4D8]" />
            : <ChevronUp className="w-3 h-3 text-[#00B4D8]" />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 w-10">#</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Student</th>
                        <th className="py-2 px-3 text-xs font-semibold text-gray-500">
                            <button type="button" className="flex items-center gap-1 hover:text-gray-700 transition-colors ml-auto" onClick={() => toggleSort("interviewCount")}>
                                Interviews <SortIcon col="interviewCount" />
                            </button>
                        </th>
                        <th className="py-2 px-3 text-xs font-semibold text-gray-500">
                            <button type="button" className="flex items-center gap-1 hover:text-gray-700 transition-colors ml-auto" onClick={() => toggleSort("avgScore")}>
                                Avg Score <SortIcon col="avgScore" />
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((student, i) => {
                        const { text } = scoreColor(student.avgScore);
                        return (
                            <tr
                                key={student.userId}
                                className={`border-b border-gray-50 transition-colors ${hoveredIdx === i ? "bg-gray-50" : ""}`}
                                onMouseEnter={() => setHoveredIdx(i)}
                                onMouseLeave={() => setHoveredIdx(null)}
                            >
                                <td className="py-2.5 px-3 text-gray-400 font-medium">{i + 1}</td>
                                <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-[#1B2744] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {student.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-gray-800 truncate max-w-[160px]">{student.userName}</span>
                                    </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-gray-700">{student.interviewCount}</td>
                                <td className="py-2.5 px-3 text-right">
                                    {student.avgScore != null
                                        ? <span className={`font-bold ${text}`}>{student.avgScore.toFixed(2)}</span>
                                        : <span className="text-gray-400 text-xs">—</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Top Events list
// ---------------------------------------------------------------------------
function TopEventsList({ rows }: { rows: EventPoint[] }) {
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

    if (!rows || rows.length === 0) return <EmptyChartState />;

    const max = Math.max(...rows.map((r) => r.registrations), 1);

    return (
        <div className="space-y-3">
            {rows.map((row, i) => (
                <div
                    key={row.id}
                    className={`border rounded-lg p-3 transition-all cursor-default ${hoveredIdx === i ? "border-[#00B4D8]/40 bg-cyan-50/30" : "border-gray-100"}`}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                >
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 truncate">{row.title}</p>
                        <span className="text-sm font-bold text-[#1B2744] shrink-0">{row.registrations}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{row.eventType}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(row.registrations / max) * 100}%`,
                                background: hoveredIdx === i ? "#00B4D8" : "#1B2744",
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function EmptyChartState() {
    return (
        <div className="h-48 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
            No data available yet
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
type StatItem = { label: string; value: string; icon: React.ReactElement; sub?: string };

export default function StudentAnalytics() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
    const userName = user?.email?.split("@")[0] || "";
    const userID = "2024-00001";

    const [stats, setStats] = React.useState<StatItem[]>([]);
    const [monthlyTrends, setMonthlyTrends] = React.useState<MonthlyTrendPoint[]>([]);
    const [scoreDistribution, setScoreDistribution] = React.useState<CountPoint[]>([]);
    const [scoreTrend, setScoreTrend] = React.useState<ScoreTrendPoint[]>([]);
    const [sessionStatusBreakdown, setSessionStatusBreakdown] = React.useState<CountPoint[]>([]);
    const [engagementFunnel, setEngagementFunnel] = React.useState({ totalStudents: 0, withInterview: 0, withApplication: 0 });
    const [topStudents, setTopStudents] = React.useState<TopStudentPoint[]>([]);
    const [topEvents, setTopEvents] = React.useState<EventPoint[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);

    async function handleLogout() {
        try { await signOut(); } catch (error) { console.error("Logout error:", error); } finally { navigate("/login"); }
    }

    function handleNavigate(route: string) { navigate(`/${route}`); }

    React.useEffect(() => {
        async function loadAnalytics() {
            try {
                setLoading(true);
                const data = await fetchStudentAnalyticsData();

                setStats([
                    { label: "Active Students", value: data.activeStudents.toString(), icon: <Users className="w-5 h-5 text-[#00B4D8]" /> },
                    { label: "Interviews", value: data.interviews.toString(), icon: <ClipboardList className="w-5 h-5 text-[#00B4D8]" /> },
                    { label: "Avg Score", value: `${data.avgScore.toFixed(1)}/5`, icon: <TrendingUp className="w-5 h-5 text-[#00B4D8]" /> },
                    { label: "Events", value: data.events.toString(), icon: <Calendar className="w-5 h-5 text-[#00B4D8]" /> },
                    {
                        label: "Completion Rate",
                        value: `${data.completionRate}%`,
                        icon: <Award className="w-5 h-5 text-emerald-500" />,
                        sub: "interviews finished",
                    },
                    {
                        label: "Inactive Students",
                        value: data.inactiveStudentCount.toString(),
                        icon: <UserX className="w-5 h-5 text-red-400" />,
                        sub: "no activity recorded",
                    },
                ]);

                setMonthlyTrends(data.monthlyTrends);
                setScoreDistribution(data.scoreDistribution);
                setScoreTrend(data.scoreTrend);
                setSessionStatusBreakdown(data.sessionStatusBreakdown);
                setEngagementFunnel(data.engagementFunnel);
                setTopStudents(data.topStudents);
                setTopEvents(data.topEvents);
            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadAnalytics();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
                <AdminNavbar userName={userName} userID={userID} onLogout={handleLogout} onNavigate={handleNavigate} activeNav="admin/student_analytics" />
            </div>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
                    <div className="relative h-full">
                        <div className="absolute left-0 top-0 bottom-0">
                            <AdminNavbar
                                userName={userName} userID={userID}
                                onLogout={() => { setMobileOpen(false); handleLogout(); }}
                                onNavigate={(r) => { setMobileOpen(false); handleNavigate(r); }}
                                activeNav="admin/student_analytics"
                            />
                        </div>
                        <button type="button" aria-label="Close sidebar" className="absolute top-4 right-4 p-2 rounded-md bg-white/90" onClick={() => setMobileOpen(false)}>
                            <X className="w-5 h-5 text-gray-800" />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="md:ml-72">
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button type="button" aria-label="Open navigation menu" onClick={() => setMobileOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
                            <Menu className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                <main className="p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports &amp; Analytics</h1>
                        <p className="text-gray-500 mt-1 text-sm">Student engagement and interview statistics</p>
                    </div>

                    {/* 6 stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {stats.map((item) => (
                            <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                    {item.icon}
                                    <span>{item.label}</span>
                                </div>
                                <div className="text-2xl font-semibold text-gray-900">
                                    {loading ? <span className="text-gray-300">…</span> : item.value}
                                </div>
                                {item.sub && <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Row 1: Monthly Trends + Session Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Monthly Trends" subtitle="Click legend to toggle series">
                            <InteractiveBarChart
                                data={monthlyTrends}
                                leftKey="interviews"
                                rightKey="applications"
                                leftLabel="Interviews"
                                rightLabel="Applications"
                            />
                        </ChartCard>
                        <ChartCard title="Interview Session Status" subtitle="Breakdown of all sessions">
                            <DonutChart data={sessionStatusBreakdown} />
                        </ChartCard>
                    </div>

                    {/* Row 2: Score Distribution + Score Trend */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Score Distribution" subtitle="How students are performing">
                            <InteractiveHorizontalBar data={scoreDistribution} />
                        </ChartCard>
                        <ChartCard title="Score Trend" subtitle="Average interview score by month">
                            <ScoreTrendChart data={scoreTrend} />
                        </ChartCard>
                    </div>

                    {/* Row 3: Engagement Funnel (full width) */}
                    <ChartCard title="Student Engagement Funnel" subtitle="Where students are in their career journey">
                        <FunnelChart data={engagementFunnel} />
                    </ChartCard>

                    {/* Row 4: Top Students Leaderboard (full width) */}
                    <ChartCard title="Top Students" subtitle="Ranked by interview performance — click column headers to sort">
                        <LeaderboardTable data={topStudents} />
                    </ChartCard>

                    {/* Row 5: Top Events (full width) */}
                    <ChartCard title="Top Events by Registration" subtitle="Most attended career events">
                        <TopEventsList rows={topEvents} />
                    </ChartCard>
                </main>
            </div>
        </div>
    );
}

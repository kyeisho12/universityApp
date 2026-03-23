import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import {
    fetchStudentAnalyticsData,
    type MonthlyTrendPoint,
    type ActivityTrendPoint,
    type CountPoint,
    type EventPoint,
} from "../../services/studentAnalyticsService";
import {
    X,
    Users,
    ClipboardList,
    TrendingUp,
    Calendar,
    Menu,
} from "lucide-react";

type StatItem = { label: string; value: string; icon: React.ReactElement };

export default function StudentAnalytics() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
    const userName = user?.email?.split("@")[0] || "";
    const userID = "2024-00001";

    const [stats, setStats] = React.useState<StatItem[]>([]);
    const [monthlyTrends, setMonthlyTrends] = React.useState<MonthlyTrendPoint[]>([]);
    const [scoreDistribution, setScoreDistribution] = React.useState<CountPoint[]>([]);
    const [monthlyActivityTrends, setMonthlyActivityTrends] = React.useState<ActivityTrendPoint[]>([]);
    const [applicationStatus, setApplicationStatus] = React.useState<CountPoint[]>([]);
    const [eventsByType, setEventsByType] = React.useState<CountPoint[]>([]);
    const [topEvents, setTopEvents] = React.useState<EventPoint[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);

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
        async function loadAnalytics() {
            try {
                setLoading(true);
                const data = await fetchStudentAnalyticsData();

                setStats([
                    {
                        label: "Active Students",
                        value: data.activeStudents.toString(),
                        icon: <Users className="w-5 h-5 text-[#00B4D8]" />,
                    },
                    {
                        label: "Interviews",
                        value: data.interviews.toString(),
                        icon: <ClipboardList className="w-5 h-5 text-[#00B4D8]" />,
                    },
                    {
                        label: "Avg Score",
                        value: `${data.avgScore.toFixed(1)}/5`,
                        icon: <TrendingUp className="w-5 h-5 text-[#00B4D8]" />,
                    },
                    {
                        label: "Events",
                        value: data.events.toString(),
                        icon: <Calendar className="w-5 h-5 text-[#00B4D8]" />,
                    },
                ]);

                setMonthlyTrends(data.monthlyTrends);
                setScoreDistribution(data.scoreDistribution);
                setMonthlyActivityTrends(data.monthlyActivityTrends);
                setApplicationStatus(data.applicationStatus);
                setEventsByType(data.eventsByType);
                setTopEvents(data.topEvents);
            } catch (error) {
                console.error("Error fetching analytics data:", error);
                setStats([]);
                setMonthlyTrends([]);
                setScoreDistribution([]);
                setMonthlyActivityTrends([]);
                setApplicationStatus([]);
                setEventsByType([]);
                setTopEvents([]);
            } finally {
                setLoading(false);
            }
        }

        loadAnalytics();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar (hidden on small screens) - Fixed position */}
            <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
                <AdminNavbar
                    userName={userName}
                    userID={userID}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    activeNav="admin/student_analytics"
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
                                activeNav="admin/student_analytics"
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
                                aria-label="Open navigation menu"
                                onClick={() => setMobileOpen(true)}
                                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <Menu className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Reports &amp; Analytics</h1>
                                <p className="text-gray-500 mt-1">Student engagement and interview statistics</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((item) => (
                                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-semibold text-gray-900">
                                        {loading ? "..." : item.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Monthly Trends">
                                <DualBarChart
                                    data={monthlyTrends}
                                    leftKey="interviews"
                                    rightKey="applications"
                                    leftLabel="Interviews"
                                    rightLabel="Applications"
                                />
                            </ChartCard>
                            <ChartCard title="Score Distribution">
                                <HorizontalBarChart data={scoreDistribution} />
                            </ChartCard>
                        </div>

                        {/* Additional Analytics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Monthly Activity Trends">
                                <DualBarChart
                                    data={monthlyActivityTrends}
                                    leftKey="newStudents"
                                    rightKey="registrations"
                                    leftLabel="New Students"
                                    rightLabel="Registrations"
                                />
                            </ChartCard>
                            <ChartCard title="Application Status Breakdown">
                                <HorizontalBarChart data={applicationStatus} />
                            </ChartCard>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Events by Type">
                                <HorizontalBarChart data={eventsByType} />
                            </ChartCard>
                            <ChartCard title="Top Events by Registration">
                                <TopEventsList rows={topEvents} />
                            </ChartCard>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            {children}
        </div>
    );
}

function DualBarChart({
    data,
    leftKey,
    rightKey,
    leftLabel,
    rightLabel,
}: {
    data: any[];
    leftKey: string;
    rightKey: string;
    leftLabel: string;
    rightLabel: string;
}) {
    if (!data || data.length === 0) {
        return <EmptyChartState />;
    }

    const max = Math.max(...data.map((item) => Math.max(Number(item[leftKey]) || 0, Number(item[rightKey]) || 0)), 1);

    return (
        <div className="h-64 flex flex-col gap-3">
            <div className="flex items-center gap-4 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#1B2744]" />{leftLabel}</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#00B4D8]" />{rightLabel}</span>
            </div>
            <div className="flex-1 grid grid-cols-6 gap-3 items-end">
                {data.map((item) => {
                    const leftHeight = ((Number(item[leftKey]) || 0) / max) * 100;
                    const rightHeight = ((Number(item[rightKey]) || 0) / max) * 100;
                    return (
                        <div key={item.month} className="flex flex-col items-center gap-2">
                            <div className="h-44 w-full flex items-end justify-center gap-1">
                            <div className="w-3 rounded-t bg-[#1B2744]" style={{ height: `${leftHeight}%` } as React.CSSProperties} />
                                <div className="w-3 rounded-t bg-[#00B4D8]" style={{ height: `${rightHeight}%` } as React.CSSProperties} />
                            </div>
                            <span className="text-xs text-gray-600">{item.month}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function HorizontalBarChart({ data }: { data: CountPoint[] }) {
    if (!data || data.length === 0) {
        return <EmptyChartState />;
    }

    const max = Math.max(...data.map((item) => item.count), 1);

    return (
        <div className="h-64 overflow-y-auto pr-1 space-y-3">
            {data.map((item) => {
                const width = (item.count / max) * 100;
                return (
                    <div key={item.label}>
                        <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                            <span>{item.label}</span>
                            <span className="font-semibold">{item.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-[#00B4D8] rounded-full" style={{ width: `${width}%` } as React.CSSProperties} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TopEventsList({ rows }: { rows: EventPoint[] }) {
    if (!rows || rows.length === 0) {
        return <EmptyChartState />;
    }

    const max = Math.max(...rows.map((row) => row.registrations), 1);

    return (
        <div className="h-64 overflow-y-auto pr-1 space-y-3">
            {rows.map((row) => (
                <div key={row.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 truncate">{row.title}</p>
                        <span className="text-sm font-bold text-[#1B2744]">{row.registrations}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{row.eventType}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                            className="h-full bg-[#1B2744]"
                            style={{ width: `${(row.registrations / max) * 100}%` } as React.CSSProperties}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyChartState() {
    return (
        <div className="h-64 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
            No data available yet
        </div>
    );
}


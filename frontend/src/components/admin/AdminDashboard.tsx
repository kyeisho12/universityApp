import React from "react";
import {
  Bell,
  Users,
  Building2,
  MessageSquare,
  CalendarDays,
  ChevronRight,
  BarChart3,
  X,
  Menu,
} from "lucide-react";
import { AdminNavbar } from "../common/AdminNavbar";
import { supabase } from "../../lib/supabaseClient";

interface DashboardMetrics {
  totalStudents: number;
  totalEmployers: number;
  totalInterviews: number;
  activeEvents: number;
}

interface Activity {
  type: string;
  text: string;
  time_ago: string;
  timestamp: string;
}

export const AdminDashboard = ({ email, onLogout, onNavigate }: { email: string; onLogout: () => void; onNavigate: (route: string) => void }) => {
  const userName = email.split("@")[0];
  const userID = "2024-00001";
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  
  const [metrics, setMetrics] = React.useState<DashboardMetrics>({
    totalStudents: 0,
    totalEmployers: 0,
    totalInterviews: 0,
    activeEvents: 0,
  });
  
  const [activities, setActivities] = React.useState<Activity[]>([]);

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch students count
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student');

      // Fetch employers count
      const { data: employersData, error: employersError } = await supabase
        .from('employers')
        .select('id');

      // Fetch completed interviews
      const { data: interviewsData, error: interviewsError } = await supabase
        .from('interviews')
        .select('id')
        .eq('status', 'completed');

      // Fetch active events (future events)
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      const { data: eventsData, error: eventsError } = await supabase
        .from('career_events')
        .select('id, title, event_type, date, time, location')
        .gte('date', today)
        .order('date', { ascending: true });

      // Fetch recent activity data
      const recentActivities: Activity[] = [];

      // Recent interviews
      const { data: recentInterviews } = await supabase
        .from('interviews')
        .select('user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentInterviews) {
        recentInterviews.forEach((interview) => {
          const created = new Date(interview.created_at);
          const now = new Date();
          const diffMs = now.getTime() - created.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          
          let timeAgo = 'Just now';
          if (diffMins < 60) {
            timeAgo = `${diffMins}m ago`;
          } else if (diffMins < 1440) {
            timeAgo = `${Math.floor(diffMins / 60)}h ago`;
          }

          recentActivities.push({
            type: 'interview',
            text: `Student ${interview.user_id?.substring(0, 8) || 'Unknown'} completed mock interview`,
            time_ago: timeAgo,
            timestamp: interview.created_at,
          });
        });
      }

      // Recent student registrations
      const { data: recentStudents } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentStudents) {
        recentStudents.forEach((student) => {
          const created = new Date(student.created_at);
          const now = new Date();
          const diffMs = now.getTime() - created.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          
          let timeAgo = 'Just now';
          if (diffMins < 60) {
            timeAgo = `${diffMins}m ago`;
          } else if (diffMins < 1440) {
            timeAgo = `${Math.floor(diffMins / 60)}h ago`;
          }

          recentActivities.push({
            type: 'registration',
            text: `New student registration: ${student.full_name || 'Unknown'}`,
            time_ago: timeAgo,
            timestamp: student.created_at,
          });
        });
      }

      // Recent job postings
      const { data: recentJobs } = await supabase
        .from('jobs')
        .select('title, employer_id, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentJobs) {
        recentJobs.forEach((job) => {
          const created = new Date(job.created_at);
          const now = new Date();
          const diffMs = now.getTime() - created.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          
          let timeAgo = 'Just now';
          if (diffMins < 60) {
            timeAgo = `${diffMins}m ago`;
          } else if (diffMins < 1440) {
            timeAgo = `${Math.floor(diffMins / 60)}h ago`;
          }

          recentActivities.push({
            type: 'job',
            text: `New job posted: ${job.title}`,
            time_ago: timeAgo,
            timestamp: job.created_at,
          });
        });
      }

      // Sort activities by timestamp
      recentActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setMetrics({
        totalStudents: studentsData?.length || 0,
        totalEmployers: employersData?.length || 0,
        totalInterviews: interviewsData?.length || 0,
        activeEvents: eventsData?.length || 0,
      });

      setActivities(recentActivities.slice(0, 4));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (hidden on small screens) - Fixed position */}
      <div className="fixed inset-y-0 left-0 w-72 z-40 hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="admin/dashboard"
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
                  onLogout();
                }}
                onNavigate={(r) => {
                  setMobileOpen(false);
                  onNavigate(r);
                }}
                activeNav="dashboard"
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
            <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
          </div>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-500">Overview of career service activities</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Users className="w-5 h-5 text-gray-600" />}
              number={loading ? "..." : metrics.totalStudents.toLocaleString()}
              label="Total Students"
            />
            <StatCard
              icon={<Building2 className="w-5 h-5 text-gray-600" />}
              number={loading ? "..." : metrics.totalEmployers.toLocaleString()}
              label="Partner Companies"
            />
            <StatCard
              icon={<MessageSquare className="w-5 h-5 text-gray-600" />}
              number={loading ? "..." : metrics.totalInterviews.toLocaleString()}
              label="Interviews Completed"
            />
            <StatCard
              icon={<CalendarDays className="w-5 h-5 text-gray-600" />}
              number={loading ? "..." : metrics.activeEvents.toLocaleString()}
              label="Active Events"
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
                <div className="space-y-4 flex-1">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-100 rounded p-3 animate-pulse h-12"></div>
                      ))}
                    </div>
                  ) : activities.length > 0 ? (
                    activities.map((activity, index) => (
                      <ActivityItem
                        key={index}
                        text={activity.text}
                        time={activity.time_ago}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 h-full flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
                <div className="space-y-3 flex flex-col flex-1">
                  <QuickActionButton
                    icon={<Users className="w-5 h-5" />}
                    label="Manage Students"
                    onClick={() => onNavigate("admin/manage_students")}
                  />
                  <QuickActionButton
                    icon={<Building2 className="w-5 h-5" />}
                    label="Employer Partners"
                    onClick={() => onNavigate("admin/employer_partners")}
                  />
                  <QuickActionButton
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Mock Interviews"
                    onClick={() => onNavigate("admin/mock_interview")}
                  />
                  <QuickActionButton
                    icon={<BarChart3 className="w-5 h-5" />}
                    label="View Analytics"
                    onClick={() => onNavigate("admin/student_analytics")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

function StatCard({
  icon,
  number,
  label,
}: {
  icon: React.ReactNode;
  number: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-gray-100 p-3 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{number}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
      <div className="w-2 h-2 bg-[#00B4D8] rounded-full mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 font-medium">{text}</p>
        <p className="text-sm text-gray-500">{time}</p>
      </div>
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#00B4D8] hover:bg-gray-50 transition-all group"
    >
      <div className="text-gray-600 group-hover:text-[#00B4D8]">{icon}</div>
      <span className="flex-1 text-left font-medium text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#00B4D8]" />
    </button>
  );
}


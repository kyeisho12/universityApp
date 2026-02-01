import React from "react";
import {
  Search,
  Bell,
  LayoutGrid,
  Briefcase,
  FileText,
  Calendar,
  Zap,
  ChevronRight,
  Upload,
  Eye,
  X,
} from "lucide-react";
import { Sidebar } from "../common/Sidebar";
import { supabase } from "../../lib/supabaseClient";

interface JobData {
  id: string;
  title: string;
  job_type: string;
  location: string;
  employer: { name: string } | null;
  deadline: string;
  created_at: string;
}

interface EventData {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
}

export const Dashboard = ({ email, fullName, displayName, studentId, onLogout, onNavigate }: { email: string; fullName?: string; displayName?: string; studentId?: string; onLogout: () => void; onNavigate: (route: string) => void }) => {
  const userName = displayName?.trim() || fullName?.trim() || email.split("@")[0];
  const userID = studentId || "2024-00001";
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  
  // State for dashboard data
  const [jobsCount, setJobsCount] = React.useState<number>(0);
  const [resumesCount, setResumesCount] = React.useState<number>(0);
  const [eventsCount, setEventsCount] = React.useState<number>(0);
  const [interviewsCount, setInterviewsCount] = React.useState<number>(0);
  const [jobs, setJobs] = React.useState<JobData[]>([]);
  const [events, setEvents] = React.useState<EventData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Fetch dashboard data
  React.useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // Get user ID for fetching user-specific data
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Fetch all active jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id, title, job_type, location, employer:employer_id(name), deadline, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!jobsError && jobsData) {
          setJobsCount(jobsData.length);
          setJobs(jobsData as JobData[]);
        }

        // Fetch all career events (for count)
        const { data: eventsData, error: eventsError } = await supabase
          .from('career_events')
          .select('id, title, event_type, start_date, end_date')
          .gte('end_date', new Date().toISOString())
          .order('start_date', { ascending: true });

        if (!eventsError && eventsData) {
          setEventsCount(eventsData.length);
          setEvents(eventsData as EventData[]);
        }

        // Fetch user resumes if user is logged in
        if (userId) {
          const { data: resumesData, error: resumesError } = await supabase
            .from('resumes')
            .select('id')
            .eq('user_id', userId);

          if (!resumesError && resumesData) {
            setResumesCount(resumesData.length);
          }

          // Fetch user interviews count if user is logged in
          const { data: interviewsData, error: interviewsError } = await supabase
            .from('interviews')
            .select('id')
            .eq('user_id', userId);

          if (!interviewsError && interviewsData) {
            setInterviewsCount(interviewsData.length);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/dashboard"
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
                onLogout={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
                onNavigate={(r) => {
                  setMobileOpen(false);
                  onNavigate(r);
                }}
                activeNav="student/dashboard"
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between z-10 gap-3 flex-shrink-0">
          <div className="md:hidden mr-2">
            <button
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <LayoutGrid className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md">
            <input
              type="text"
              placeholder="Search jobs, events, resources..."
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 cursor-pointer hover:text-gray-900 flex-shrink-0" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
          {/* Welcome Section */}
          <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-0.5 sm:mb-1">
              Welcome back, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Here's what's happening with your career journey
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-5 lg:mb-6">
            <StatCard
              icon={<Briefcase className="w-8 h-8 text-gray-400" />}
              number={loading ? "..." : jobsCount.toString()}
              label="Active Job Listings"
            />
            <StatCard
              icon={<FileText className="w-8 h-8 text-gray-400" />}
              number={loading ? "..." : resumesCount.toString()}
              label="My Résumés"
            />
            <StatCard
              icon={<Calendar className="w-8 h-8 text-gray-400" />}
              number={loading ? "..." : eventsCount.toString()}
              label="Upcoming Events"
            />
            <StatCard
              icon={<Eye className="w-8 h-8 text-gray-400" />}
              number={loading ? "..." : interviewsCount.toString()}
              label="Mock Interviews"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 auto-rows-max md:auto-rows-fr">
            {/* Left Column - Recent Job Listings */}
            <div className="md:col-span-2 lg:col-span-2 flex flex-col">
              <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-100 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 md:mb-4 gap-2">
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                    Recent Job Listings
                  </h2>
                  <button
                    onClick={() => onNavigate && onNavigate("student/jobs")}
                    className="text-[#00B4D8] hover:text-[#0096C7] font-medium flex items-center gap-1 text-xs sm:text-sm md:text-base whitespace-nowrap"
                  >
                    View All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <div className="space-y-2 sm:space-y-3 md:space-y-4 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-100 rounded-lg p-3 sm:p-4 animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : jobs.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      {jobs.map((job) => (
                        <JobListingItem
                          key={job.id}
                          title={job.title}
                          company={job.employer?.name || "Company"}
                          location={job.location}
                          type={job.job_type}
                          deadline={job.deadline}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                      <div className="bg-gray-100 p-3 sm:p-4 rounded-full mb-4">
                        <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium text-sm">No job listings available</p>
                      <p className="text-gray-400 text-xs mt-1">Check back soon for new opportunities</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3 sm:space-y-4 md:space-y-5 h-full flex flex-col md:min-h-0">
              {/* AI-Powered Card */}
              <div className="bg-gradient-to-br from-[#0096C7] to-[#00B4D8] rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 text-white shadow-lg flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2 md:mb-3">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs font-medium">AI-Powered</span>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-1 sm:mb-1.5 md:mb-2">
                    Practice Your Interview
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm mb-2 sm:mb-3 md:mb-4">
                    Get AI-evaluated feedback on your interview skills
                  </p>
                </div>
                <button
                  onClick={() => onNavigate && onNavigate("student/interview")}
                  className="w-full bg-white text-[#0096C7] py-1.5 sm:py-2 md:py-2.5 rounded-lg font-semibold text-xs sm:text-sm md:text-base hover:bg-blue-50 transition-colors"
                >
                  Start Mock Interview
                </button>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm border border-gray-100 flex-1 overflow-y-auto">
                <button
                  onClick={() => onNavigate && onNavigate("student/events")}
                  className="w-full flex items-center justify-between mb-2 sm:mb-3 md:mb-4 hover:opacity-70 transition-opacity"
                >
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                    Upcoming Events
                  </h3>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-400" />
                </button>

                <div className="space-y-2 sm:space-y-3 md:space-y-4 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-100 rounded-lg p-3 sm:p-4 animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : events.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      {events.slice(0, 3).map((event) => (
                        <EventItem
                          key={event.id}
                          title={event.title}
                          type={event.event_type}
                          date={new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                      <div className="bg-gray-100 p-3 sm:p-4 rounded-full mb-4">
                        <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium text-sm">No upcoming events</p>
                      <p className="text-gray-400 text-xs mt-1">Events will appear here when available</p>
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
};

function StatCard({ icon, number, label }: { icon: React.ReactNode; number: string; label: string }) {
  return (
    <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
        <div className="bg-gray-100 p-1.5 sm:p-2 rounded-lg flex items-center justify-center">{icon}</div>
      </div>
      <div className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 mb-0.5">{number}</div>
      <div className="text-xs sm:text-xs md:text-sm text-gray-600 leading-tight">{label}</div>
    </div>
  );
}

function JobListingItem({ title, company, location, type, deadline }: { title: string; company: string; location: string; type: string; deadline: string }) {
  const getJobTypeColor = (jobType: string) => {
    switch (jobType.toLowerCase()) {
      case 'full-time':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'part-time':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'internship':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'contract':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const daysUntilDeadline = () => {
    const deadline_date = new Date(deadline);
    const today = new Date();
    const diff = Math.ceil((deadline_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Expired';
    if (diff === 1) return 'Today';
    if (diff <= 7) return `${diff}d left`;
    return deadline_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white border border-gray-200 hover:border-[#00B4D8] hover:shadow-md transition-all duration-200 rounded-lg p-3 sm:p-4 md:p-5 cursor-pointer group">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Company Logo Placeholder */}
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#00B4D8] to-[#0096C7] rounded-lg flex items-center justify-center shadow-sm">
          <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>

        {/* Job Details */}
        <div className="flex-1 min-w-0">
          {/* Job Title */}
          <h4 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg group-hover:text-[#00B4D8] transition-colors line-clamp-2">
            {title}
          </h4>

          {/* Company and Location */}
          <p className="text-xs sm:text-sm text-gray-600 mt-1 flex flex-wrap gap-2">
            <span className="font-medium text-gray-700">{company}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{location}</span>
          </p>

          {/* Job Type Badge */}
          <div className="mt-2 sm:mt-2.5">
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${getJobTypeColor(type)}`}>
              {type}
            </span>
          </div>
        </div>

        {/* Deadline Info */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap ${
            daysUntilDeadline() === 'Expired' 
              ? 'bg-red-50 text-red-700' 
              : 'bg-amber-50 text-amber-700'
          }`}>
            {daysUntilDeadline()}
          </span>
          <span className="text-xs text-gray-500 hidden sm:block">Deadline</span>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors text-center">
      <span className="text-gray-600">{icon}</span>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
}

function EventItem({ title, type, date }: { title: string; type: string; date: string }) {
  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'job fair':
        return 'bg-blue-50 text-blue-700';
      case 'workshop':
        return 'bg-green-50 text-green-700';
      case 'seminar':
        return 'bg-purple-50 text-purple-700';
      case 'webinar':
        return 'bg-indigo-50 text-indigo-700';
      case 'announcement':
        return 'bg-orange-50 text-orange-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="bg-white border border-gray-200 hover:border-[#00B4D8] hover:shadow-md transition-all duration-200 rounded-lg p-3 sm:p-4 cursor-pointer group">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Event Icon */}
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-[#00B4D8] bg-opacity-10 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#00B4D8]" />
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0 flex-col">
          <h4 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#00B4D8] transition-colors line-clamp-2">
            {title}
          </h4>
          <span className={`inline-block text-xs font-semibold mt-2 px-2.5 py-1 rounded-full w-fit ${getEventTypeColor(type)}`}>
            {type}
          </span>
        </div>

        {/* Event Date */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs sm:text-sm font-bold text-[#00B4D8]">{date}</span>
          <span className="text-xs text-gray-500 hidden sm:block">Date</span>
        </div>
      </div>
    </div>
  );
}


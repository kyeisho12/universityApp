import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, GraduationCap, Briefcase, PencilLine, Menu, X } from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

export default function StudentProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!active) return;
      if (!error) setProfile(data || null);
      setLoading(false);
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      navigate("/login");
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const studentId = profile?.student_number || profile?.student_id || "";
  const department = profile?.university || "Department";
  const college = profile?.college || "";
  const skills = Array.isArray(profile?.skills_entries)
    ? profile.skills_entries
    : (profile?.skills || "")
        .split(/[\n,]/g)
        .map((item: string) => item.trim())
        .filter(Boolean);

  const normalizeList = (value: unknown) => {
    if (Array.isArray(value)) {
      const cleaned = value.map((item) => `${item}`.trim()).filter(Boolean);
      return cleaned;
    }
    if (typeof value === "string") {
      const cleaned = value
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean);
      return cleaned;
    }
    return [];
  };

  const preferredJobTypes = normalizeList(profile?.preferred_job_types ?? profile?.job_type);
  const preferredIndustries = normalizeList(profile?.preferred_industries ?? profile?.Pref_Industries);
  const preferredLocations = normalizeList(profile?.preferred_locations ?? profile?.Pref_Location);

  const expectedSalaryRaw = profile?.expected_salary_range ?? profile?.Expected_Salary;

  const expectedSalaryRange = (() => {
    if (typeof expectedSalaryRaw === "string" && expectedSalaryRaw.trim()) {
      const value = expectedSalaryRaw.trim();

      // Handle range like "20000-30000"
      if (value.includes("-")) {
        const [min, max] = value.split("-").map(v => Number(v.trim()));
        if (Number.isFinite(min) && Number.isFinite(max)) {
          return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}/month`;
        }
      }

      // Handle single number in string
      const num = Number(value);
      if (Number.isFinite(num)) {
        return `₱${num.toLocaleString()}/month`;
      }

      return value;
    }

    if (typeof expectedSalaryRaw === "number" && Number.isFinite(expectedSalaryRaw)) {
      return `₱${expectedSalaryRaw.toLocaleString()}/month`;
    }

    return "";
  })();

  const educationEntries = Array.isArray(profile?.education_entries) ? profile.education_entries : [];
  const workEntries = Array.isArray(profile?.work_experience_entries) ? profile.work_experience_entries : [];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          userName={displayName}
          userID={studentId}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="student/profile"
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <div className="absolute left-0 top-0 bottom-0">
              <Sidebar
                userName={displayName}
                userID={studentId}
                onLogout={() => { setMobileOpen(false); handleLogout(); }}
                onNavigate={(r) => { setMobileOpen(false); handleNavigate(r); }}
                activeNav="student/profile"
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-500">Manage your personal information, education, and skills</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('tsu_onboarding_welcome_seen');
                  localStorage.removeItem('tsu_onboarding_card_dismissed');
                  navigate('/student/dashboard');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50"
                title="Reset onboarding so it shows again on the dashboard"
              >
                Reset Onboarding
              </button>
              <button
                type="button"
                onClick={() => navigate("/create-profile?edit=1")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1B2744] text-white font-semibold hover:bg-[#14203a]"
              >
                <PencilLine className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-500">Loading profile...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
                      <p className="text-sm text-gray-500">{studentId}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#00B4D8] bg-[#E0F7FA] px-3 py-1 rounded-full">
                      {department} {college && `- ${college}`}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4 text-sm text-gray-600">
                    <div className="flex items-center gap-3 min-w-0">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="break-all min-w-0">{profile?.email || user?.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{profile?.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{profile?.address || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills & Competencies</h3>
                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill: string) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No skills added yet.</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">About Me</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {profile?.bio || "Tell us about yourself by adding a short bio."}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                  </div>
                  {educationEntries.length > 0 ? (
                    <div className="space-y-3">
                      {educationEntries.map((entry: any, index: number) => (
                        <div key={`edu-${index}`} className="border border-gray-100 rounded-xl p-4">
                          <h4 className="font-semibold text-gray-900">
                            {entry.degree || "—"} {entry.field ? `in ${entry.field}` : ""}
                          </h4>
                          <p className="text-sm text-gray-500">{entry.school || "—"}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {entry.start_year || ""}
                            {entry.end_year ? ` - ${entry.end_year}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : profile?.university || profile?.major ? (
                    <div className="border border-gray-100 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900">Bachelor of Science in {profile?.major || "—"}</h4>
                      <p className="text-sm text-gray-500">{profile?.university || "—"}</p>
                      <p className="text-xs text-gray-400 mt-2">Graduation Year: {profile?.graduation_year || "—"}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No education details yet.</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
                  </div>
                  {workEntries.length > 0 ? (
                    <div className="space-y-3">
                      {workEntries.map((entry: any, index: number) => (
                        <div key={`work-${index}`} className="border border-gray-100 rounded-xl p-4">
                          <h4 className="font-semibold text-gray-900">{entry.title || "—"}</h4>
                          <p className="text-sm text-gray-500">{entry.company || "—"}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {entry.start_date || ""}
                            {entry.end_date ? ` - ${entry.end_date}` : ""}
                          </p>
                          {entry.description && (
                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                              {entry.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : profile?.work_experience ? (
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {profile.work_experience}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">No work experience added yet.</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Career Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                        Preferred Job Types
                      </p>
                      {preferredJobTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferredJobTypes.map((item) => (
                            <span
                              key={`job-type-${item}`}
                              className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not set</p>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                        Preferred Industries
                      </p>
                      {preferredIndustries.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferredIndustries.map((item) => (
                            <span
                              key={`industry-${item}`}
                              className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not set</p>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                        Preferred Locations
                      </p>
                      {preferredLocations.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferredLocations.map((item) => (
                            <span
                              key={`location-${item}`}
                              className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not set</p>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                        Expected Salary Range
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {expectedSalaryRange || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

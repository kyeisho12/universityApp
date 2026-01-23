import React from "react";
import {
  LayoutGrid,
  Briefcase,
  ChartColumn,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  User,
} from "lucide-react";

export const AdminNavbar = ({
  userName,
  userID,
  onLogout,
  onNavigate,
  activeNav: initialActive,
}: {
  userName: string;
  userID: string;
  onLogout: () => void;
  onNavigate?: (nav: string) => void;
  activeNav?: string;
}) => {
  const [activeNav, setActiveNav] = React.useState<string>(initialActive || "dashboard");

  React.useEffect(() => {
    if (initialActive) {
      setActiveNav(initialActive);
    }
  }, [initialActive]);

  const handleNavClick = (nav: string) => {
    setActiveNav(nav);
    if (onNavigate) onNavigate(nav);
  };

  return (
    <div className="w-72 h-full bg-[#1B2744] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00B4D8] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 14l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.422L12 14z"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-bold leading-tight">TSU Career</h1>
            <p className="text-xs text-gray-400">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavItem
          icon={<LayoutGrid className="w-5 h-5" />}
          label="Dashboard"
          active={activeNav === "dashboard"}
          onClick={() => handleNavClick("dashboard")}
        />
        <NavItem
          icon={<Briefcase className="w-5 h-5" />}
          label="Employer Partners"
          active={activeNav === "admin/employer_partners"}
          onClick={() => handleNavClick("admin/employer_partners")}
        />
        <NavItem
          icon={<ChartColumn className="w-5 h-5" />}
          label="Student Analytics"
          active={activeNav === "admin/student_analytics"}
          onClick={() => handleNavClick("admin/student_analytics")}
        />
        <NavItem
          icon={<MessageSquare className="w-5 h-5" />}
          label="Mock Interviews"
          active={activeNav === "admin/mock_interview"}
          onClick={() => handleNavClick("admin/mock_interview")}
        />
        <NavItem
          icon={<Users className="w-5 h-5" />}
          label="Manage Students"
          active={activeNav === "admin/manage_students"}
          onClick={() => handleNavClick("admin/manage_students")}
        />
        <NavItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          active={activeNav === "settings"}
          onClick={() => handleNavClick("settings")}
        />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 space-y-4">
        {/* User Profile */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/50 cursor-pointer">
          <div className="w-10 h-10 bg-[#00B4D8] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate capitalize">{userName}</p>
            <p className="text-xs text-gray-400">{userID}</p>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

function NavItem({ icon, label, badge, active, onClick }: { icon: React.ReactNode; label: string; badge?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active ? "bg-[#00B4D8] text-white" : "text-gray-300 hover:bg-gray-700/50"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="ml-auto text-xs font-bold bg-gray-600 px-2 py-1 rounded">{badge}</span>
      )}
    </button>
  );
}


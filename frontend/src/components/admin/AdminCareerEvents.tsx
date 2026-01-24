import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AdminNavbar } from "../common/AdminNavbar";
import {
  X,
  Search,
  Bell,
  Menu,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Users,
  Edit,
  Trash2,
} from "lucide-react";

const API_BASE_URL = "http://localhost:3001/api";

export default function AdminCareerEvents() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null);
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    event_type: "Workshop",
    date: "",
    time: "",
    location: "",
  });

  const userName = user?.email?.split("@")[0] || "";
  const userID = "2024-00001";

  // Fetch events on component mount
  React.useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/events/`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data.data || []);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "Error fetching events");
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    { label: "Total Events", value: events.length.toString() },
    { label: "Job Fairs", value: events.filter((e) => e.event_type === "Job Fair").length.toString() },
    { label: "Workshops/Seminars", value: events.filter((e) => e.event_type === "Workshop" || e.event_type === "Seminar").length.toString() },
    { label: "Announcements", value: events.filter((e) => e.event_type === "Announcement").length.toString() },
  ];

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  function getTypeColor(type: string) {
    switch (type) {
      case "Job Fair":
        return "bg-blue-100 text-blue-700";
      case "Workshop":
        return "bg-cyan-100 text-cyan-700";
      case "Seminar":
        return "bg-green-100 text-green-700";
      case "Webinar":
        return "bg-purple-100 text-purple-700";
      case "Announcement":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function handleAddEvent() {
    setFormData({
      title: "",
      description: "",
      event_type: "Workshop",
      date: "",
      time: "",
      location: "",
    });
    setShowAddModal(true);
  }

  function handleEditEvent(event: any) {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      date: event.date,
      time: event.time,
      location: event.location,
    });
    setShowEditModal(true);
  }

  function handleCloseModal() {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedEvent(null);
    setFormData({
      title: "",
      description: "",
      event_type: "Workshop",
      date: "",
      time: "",
      location: "",
    });
  }

  async function handleSubmit() {
    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.date || !formData.location) {
        setError("Please fill in all required fields");
        return;
      }

      if (showEditModal && selectedEvent) {
        // Update event
        const response = await fetch(`${API_BASE_URL}/events/${selectedEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error("Failed to update event");
      } else {
        // Create new event
        const response = await fetch(`${API_BASE_URL}/events/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error("Failed to create event");
      }

      // Refresh events list
      await fetchEvents();
      handleCloseModal();
      setError(null);
    } catch (err) {
      console.error("Error submitting event:", err);
      setError(err instanceof Error ? err.message : "Error saving event");
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete event");

      // Refresh events list
      await fetchEvents();
      setError(null);
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(err instanceof Error ? err.message : "Error deleting event");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (hidden on small screens) */}
      <div className="hidden md:block">
        <AdminNavbar
          userName={userName}
          userID={userID}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeNav="admin/career_events"
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
                activeNav="admin/career_events"
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
      <div className="flex-1 flex flex-col">
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
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students, employers, reports..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Career Events</h1>
                <p className="text-gray-600">Manage job fairs, workshops, seminars, and announcements</p>
              </div>
              <button className="bg-[#1B2744] text-white px-6 py-3 rounded-lg hover:bg-[#15203a] transition-colors flex items-center gap-2 font-semibold" onClick={handleAddEvent}>
                <Plus className="w-5 h-5" />
                Add Event
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <p className="text-gray-600 text-sm font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No events found. Click "Add Event" to create one.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Event</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Date & Time</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Location</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{event.title}</div>
                              <div className="text-sm text-gray-500 mt-1 max-w-md truncate">{event.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(event.event_type)}`}>
                              {event.event_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {event.date}
                              </div>
                              {event.time && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  {event.time}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {event.location ? (
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="max-w-xs truncate">{event.location}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleEditEvent(event)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-[#1B2744]"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteEvent(event.id)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Event</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Event title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  placeholder="Event description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Job Fair">Job Fair</option>
                  <option value="Webinar">Webinar</option>
                  <option value="Announcement">Announcement</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="text"
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Event location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#1B2744] text-white rounded-lg hover:bg-[#15203a] transition-colors font-medium"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Event</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Event title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  placeholder="Event description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Job Fair">Job Fair</option>
                  <option value="Webinar">Webinar</option>
                  <option value="Announcement">Announcement</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="text"
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Event location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#1B2744] text-white rounded-lg hover:bg-[#15203a] transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
import { 
  getAllEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  getEventRegistrations,
  CareerEvent 
} from "../../services/careerEventService";

export default function AdminCareerEvents() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null);
  const [registrations, setRegistrations] = React.useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = React.useState(false);
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
      const data = await getAllEvents();
      setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "Error fetching events");
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    { label: "Total Events", value: events.length.toString() },
    { label: "Active Events", value: events.filter((e) => new Date(e.date) >= new Date(new Date().toISOString().split('T')[0])).length.toString() },
    { label: "Total Registrations", value: events.filter((e) => e.event_type !== "Announcement").reduce((sum, e) => sum + (e.registered || 0), 0).toString() },
    { label: "Job Fairs", value: events.filter((e) => e.event_type === "Job Fair").length.toString() },
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
    if (!formData.title || !formData.description) {
      setError("Please fill in title and description");
      return;
    }

    const eventData = {
      title: formData.title,
      description: formData.description,
      event_type: formData.event_type,
      date: formData.date || null,  // Convert empty string to null
      time: formData.time || null,  // Convert empty string to null
      location: formData.location || null,  // Convert empty string to null
    };

    if (showEditModal && selectedEvent) {
      // Update event
      await updateEvent(selectedEvent.id, eventData);
    } else {
      // Create new event
      await createEvent(eventData);
    }

    // Refresh events list
    await fetchEvents();
    handleCloseModal();
    setError(null);
  } 
  
  catch (err) {
    console.error("Error submitting event:", err);
    setError(err instanceof Error ? err.message : "Error saving event");
  }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await deleteEvent(eventId);

      // Refresh events list
      await fetchEvents();
      setError(null);
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(err instanceof Error ? err.message : "Error deleting event");
    }
  }

  async function handleViewRegistrations(event: any) {
    setSelectedEvent(event);
    setShowRegistrationsModal(true);
    setLoadingRegistrations(true);
    
    try {
      const regs = await getEventRegistrations(event.id);
      setRegistrations(regs);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      setError(err instanceof Error ? err.message : "Error fetching registrations");
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  }

  function handleCloseRegistrationsModal() {
    setShowRegistrationsModal(false);
    setSelectedEvent(null);
    setRegistrations([]);
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
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Registrations</th>
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
                            {event.event_type !== "Announcement" ? (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-gray-900">{event.registered || 0}</span>
                                {(event.registered || 0) > 0 && (
                                  <button
                                    onClick={() => handleViewRegistrations(event)}
                                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                                  >
                                    View List
                                  </button>
                                )}
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

              {formData.event_type !== "Announcement" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Event location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {formData.event_type === "Announcement" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time (Optional)</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location (Optional)</label>
                    <input
                      type="text"
                      placeholder="Event location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
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

              {formData.event_type !== "Announcement" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Event location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {formData.event_type === "Announcement" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time (Optional)</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location (Optional)</label>
                    <input
                      type="text"
                      placeholder="Event location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
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

      {/* Registrations Modal */}
      {showRegistrationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Registered Students</h2>
                <p className="text-gray-600 text-sm mt-1">{selectedEvent?.title}</p>
              </div>
              <button
                onClick={handleCloseRegistrationsModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loadingRegistrations ? (
                <div className="text-center py-12 text-gray-500">Loading registrations...</div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No students registered yet.</div>
              ) : (
                <div className="space-y-3">
                  {registrations.map((reg, index) => (
                    <div
                      key={reg.student_id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#1B2744] text-white flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{reg.full_name}</div>
                          <div className="text-sm text-gray-600">{reg.email}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseRegistrationsModal}
                className="px-6 py-2 bg-[#1B2744] text-white rounded-lg hover:bg-[#15203a] transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

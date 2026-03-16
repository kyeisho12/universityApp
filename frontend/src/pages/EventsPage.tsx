import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ClipboardList,
  X,
  Menu,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useMessageBox } from "../components/common/MessageBoxProvider";
import { useAuth } from "../hooks/useAuth";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useStudentId } from "../hooks/useStudentId";
import { useStudent } from "../context/StudentContext";
import { supabase } from "../lib/supabaseClient";
import { 
  getEventsForStudent, 
  registerForEvent, 
  EventWithRegistration 
} from "../services/careerEventService";

type NavigateHandler = (route: string) => void;

interface CareerEventsPageContentProps {
  userName: string;
  userId: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

interface Event {
  id: string;
  event_type: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  registered?: number;
  isRegistered?: boolean;
}

function CareerEventsPageContent({ userName, userId, studentId, onLogout, onNavigate }: CareerEventsPageContentProps & { studentId?: string }) {
  const messageBox = useMessageBox();
  const userID = studentId || "2024-00001";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [eventsView, setEventsView] = useState<EventWithRegistration[]>([]);
  const [showMyRegistrations, setShowMyRegistrations] = useState(false);
  const [spotlightEventId, setSpotlightEventId] = useState<string | null>(null);
  const filterStorageKey = `student_events_active_filter_${userId || "anon"}`;
  const registrationStorageKey = `student_events_registered_${userId || "anon"}`;

  const readPersistedRegistered = () => {
    try {
      const raw = window.localStorage.getItem(registrationStorageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set<string>(parsed.filter((value) => typeof value === "string"));
    } catch {
      return new Set<string>();
    }
  };

  const persistRegistered = (next: Set<string>) => {
    try {
      window.localStorage.setItem(registrationStorageKey, JSON.stringify(Array.from(next)));
    } catch (error) {
      console.error("Failed to persist event registrations:", error);
    }
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(filterStorageKey);
      if (saved) {
        setActiveFilter(saved);
      }
    } catch (error) {
      console.error("Failed to restore event filter:", error);
    }
  }, [filterStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(filterStorageKey, activeFilter);
    } catch (error) {
      console.error("Failed to persist event filter:", error);
    }
  }, [filterStorageKey, activeFilter]);

  useEffect(() => {
    setRegisteredEvents(readPersistedRegistered());
  }, [registrationStorageKey]);

  async function getSupabaseUserId(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data?.user?.id || null;
    } catch {
      return null;
    }
  }

  // Use cached query for events
  const { data: events = [], isLoading: loading, error: eventsError } = useCachedQuery(
    `events-${userID}`,
    async () => {
      const supabaseUserId = await getSupabaseUserId();
      const eventsData = await getEventsForStudent(supabaseUserId || userID);
      const locallyRegistered = readPersistedRegistered();
      
      // Track which events this student is registered for
      const registered = new Set(
        eventsData
          .filter(e => e.isRegistered || locallyRegistered.has(e.id))
          .map(e => e.id)
      );
      setRegisteredEvents(registered);
      persistRegistered(registered);
      
      return eventsData.map((event) => ({
        ...event,
        isRegistered: registered.has(event.id),
      }));
    }
  );

  useEffect(() => {
    setEventsView(events);
  }, [events]);

  const error = eventsError?.message || null;

  async function handleRegister(eventId: string) {
    if (registeredEvents.has(eventId)) {
      return;
    }

    const previousRegistered = new Set(registeredEvents);
    const optimisticRegistered = new Set(previousRegistered);
    optimisticRegistered.add(eventId);
    setRegisteredEvents(optimisticRegistered);
    persistRegistered(optimisticRegistered);
    setEventsView((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              isRegistered: true,
              registered: (event.registered || 0) + 1,
            }
          : event
      )
    );

    try {
      const supabaseUserId = await getSupabaseUserId();
      if (!supabaseUserId) {
        setRegisteredEvents(previousRegistered);
        persistRegistered(previousRegistered);
        setEventsView((prev) =>
          prev.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  isRegistered: false,
                  registered: Math.max((event.registered || 1) - 1, 0),
                }
              : event
          )
        );
        await messageBox.alert({
          title: "Sign In Required",
          message: "Please sign in to register for events.",
          tone: "warning",
        });
        return;
      }

      await registerForEvent(eventId, supabaseUserId);
    } catch (err) {
      const isAlreadyRegistered = err instanceof Error && err.message.toLowerCase().includes('already registered');
      if (!isAlreadyRegistered) {
        setRegisteredEvents(previousRegistered);
        persistRegistered(previousRegistered);
        setEventsView((prev) =>
          prev.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  isRegistered: false,
                  registered: Math.max((event.registered || 1) - 1, 0),
                }
              : event
          )
        );
        await messageBox.alert({
          title: "Registration Failed",
          message: err instanceof Error ? err.message : "Failed to register for event.",
          tone: "error",
        });
      }
    }
  }

  const filteredEvents =
    activeFilter === "all"
      ? eventsView
      : eventsView.filter((e) => e.event_type.toLowerCase() === activeFilter.toLowerCase());

  const myRegisteredEvents = useMemo(() => {
    return eventsView.filter((event) => registeredEvents.has(event.id) || event.isRegistered);
  }, [eventsView, registeredEvents]);

  const handleViewRegisteredEvent = (eventId: string) => {
    setActiveFilter("all");
    setShowMyRegistrations(false);
    setSpotlightEventId(eventId);

    window.setTimeout(() => {
      const target = document.getElementById(`event-card-${eventId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 140);
  };

  useEffect(() => {
    if (!spotlightEventId) return;
    const timeoutId = window.setTimeout(() => {
      setSpotlightEventId(null);
    }, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [spotlightEventId]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/events"
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
                onLogout={() => { setMobileOpen(false); onLogout(); }}
                onNavigate={(r) => { setMobileOpen(false); onNavigate(r); }}
                activeNav="student/events"
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
      <div className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Career Events</h1>
              <p className="text-gray-500">
                Discover and attend career development events and networking opportunities
              </p>
            </div>
            <button
              onClick={() => setShowMyRegistrations(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ClipboardList className="w-4 h-4" />
              My Event Registrations ({myRegisteredEvents.length})
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mb-4 sm:mb-6 flex gap-2 sm:gap-3 overflow-x-auto pb-2">
            {["all", "job fair", "workshop", "seminar", "webinar", "announcement"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter
                    ? "bg-[#1B2744] text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {filter === "all" ? "All Events" : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading events...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && eventsView.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">No events found</p>
            </div>
          )}

          {/* Events Grid */}
          {!loading && eventsView.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isRegistered={registeredEvents.has(event.id)}
                  onRegister={() => handleRegister(event.id)}
                  cardId={`event-card-${event.id}`}
                  spotlighted={spotlightEventId === event.id}
                />
              ))}
            </div>
          )}

          {/* My Event Registrations Modal */}
          {showMyRegistrations && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-gray-200 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">My Event Registrations</h2>
                    <p className="text-sm text-gray-500">
                      {myRegisteredEvents.length} registered event{myRegisteredEvents.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMyRegistrations(false)}
                    aria-label="Close registrations modal"
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                  {myRegisteredEvents.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-gray-500">No registered events yet.</p>
                    </div>
                  ) : (
                    myRegisteredEvents.map((event) => (
                      <div key={`registered-${event.id}`} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mb-2">
                              Registered
                            </span>
                            <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{event.event_type}</p>
                          </div>
                          <button
                            onClick={() => handleViewRegisteredEvent(event.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B2744] text-white hover:bg-[#131d33]"
                          >
                            View
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {event.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {event.time || "TBA"}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {event.location || "TBA"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({
  event,
  isRegistered,
  onRegister,
  cardId,
  spotlighted,
}: {
  event: Event;
  isRegistered: boolean;
  onRegister: () => void;
  cardId?: string;
  spotlighted?: boolean;
}) {
  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "job fair":
        return "bg-blue-50 text-blue-700";
      case "workshop":
        return "bg-cyan-50 text-cyan-700";
      case "seminar":
        return "bg-green-50 text-green-700";
      case "webinar":
        return "bg-purple-50 text-purple-700";
      case "announcement":
        return "bg-orange-50 text-orange-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <div
      id={cardId}
      className={`bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all flex flex-col h-full ${
        spotlighted
          ? "border-cyan-400 ring-2 ring-cyan-200"
          : "border-gray-100"
      }`}
    >
      {/* Header with Badge and Status */}
      <div className="flex items-start justify-between mb-4">
        <span
          className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${getTypeBadgeColor(
            event.event_type
          )}`}
        >
          {event.event_type}
        </span>
        {isRegistered && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
            <span className="w-2 h-2 bg-green-600 rounded-full" />
            Registered
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h3>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>

      {/* Event Details */}
      <div className="space-y-2 mb-6 text-sm text-gray-600 flex-1">
        {event.date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            {event.date}
          </div>
        )}
        {event.time && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            {event.time}
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            {event.location}
          </div>
        )}
        {event.event_type !== "Announcement" && event.registered && event.registered > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            {event.registered} registered
          </div>
        )}
      </div>

      {/* Action Button - Only show for non-announcements */}
      {event.event_type !== "Announcement" && (
        <button
          onClick={onRegister}
          disabled={isRegistered}
          className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${
            isRegistered
              ? "bg-emerald-100 text-emerald-700 cursor-not-allowed"
              : "bg-[#1B2744] text-white hover:bg-[#131d33]"
          }`}
        >
          {isRegistered ? "Registered" : "Register Now"}
        </button>
      )}
    </div>
  );
}

export default function EventsPage() {
  const { user, signOut } = useAuth();
  const { profile } = useStudent();
  const navigate = useNavigate();
  const studentId = useStudentId(user?.id);
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";

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

  return (
    <CareerEventsPageContent
      userName={displayName}
      userId={user?.id ?? ""}
      studentId={studentId}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}

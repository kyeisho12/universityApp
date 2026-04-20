import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ClipboardList,
  X,
  Menu,
  Bell,
  ChevronRight,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useMessageBox } from "../components/common/MessageBoxProvider";
import { useAuth } from "../hooks/useAuth";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useStudent } from "../context/StudentContext";
import { supabase } from "../lib/supabaseClient";
import {
  getEventsForStudent,
  registerForEvent,
  unregisterFromEvent,
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
  const navigate = useNavigate();
  const location = useLocation();
  const userID = studentId || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [eventsView, setEventsView] = useState<EventWithRegistration[]>([]);
  const [showMyRegistrations, setShowMyRegistrations] = useState(false);
  const [spotlightEventId, setSpotlightEventId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const notifBellRef = useRef<HTMLDivElement>(null);
  const filterStorageKey = `student_events_active_filter_${userId || "anon"}`;
  const registrationStorageKey = `student_events_registered_${userId || "anon"}`;
  const notifStorageKey = `student_events_notif_read_${userId || "anon"}`;

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(notifStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setReadNotifications(new Set(parsed));
    } catch {}
  }, [notifStorageKey]);

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!showNotifications) return;
    function handleOutsideClick(e: MouseEvent) {
      if (notifBellRef.current && !notifBellRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showNotifications]);

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
  const { data: rawEvents, isLoading: loading, error: eventsError } = useCachedQuery(
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

  const events = useMemo(() => rawEvents ?? [], [rawEvents]);

  useEffect(() => {
    setEventsView(events);
  }, [events]);

  // Handle URL query parameter for event ID from dashboard navigation
  useEffect(() => {
    if (!events.length) return;

    const params = new URLSearchParams(location.search);
    const eventIdFromUrl = params.get("id");

    if (eventIdFromUrl && events.some((event) => event.id === eventIdFromUrl)) {
      setSpotlightEventId(eventIdFromUrl);
      window.setTimeout(() => {
        const target = document.getElementById(`event-card-${eventIdFromUrl}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [location.search, events]);

  const error = eventsError?.message || null;

  const getDaysUntil = (dateStr: string): { label: string; urgent: boolean } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    const diff = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: "Past event", urgent: false };
    if (diff === 0) return { label: "Today!", urgent: true };
    if (diff === 1) return { label: "Tomorrow", urgent: true };
    if (diff <= 7) return { label: `In ${diff} days`, urgent: true };
    return { label: `In ${diff} days`, urgent: false };
  };

  const persistReadNotifs = (next: Set<string>) => {
    try {
      window.localStorage.setItem(notifStorageKey, JSON.stringify(Array.from(next)));
    } catch {}
  };

  const markAllRead = () => {
    const allIds = new Set(upcomingRegisteredEvents.map((e) => e.id));
    setReadNotifications(allIds);
    persistReadNotifs(allIds);
  };

  const handleNotifItemClick = (eventId: string) => {
    const next = new Set(readNotifications);
    next.add(eventId);
    setReadNotifications(next);
    persistReadNotifs(next);
    setShowNotifications(false);
    handleViewRegisteredEvent(eventId);
  };

  async function handleRegister(eventId: string) {
    if (registeredEvents.has(eventId)) {
      return;
    }

    const eventDetails = eventsView.find((e) => e.id === eventId);
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

    if (eventDetails) {
      messageBox.toast({
        title: "Registration Confirmed!",
        message: `You have registered for "${eventDetails.title}" happening on ${eventDetails.date}${eventDetails.time ? ` at ${eventDetails.time}` : ""}.`,
        tone: "success",
      });
    }

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

  async function handleUnregister(eventId: string) {
    if (!registeredEvents.has(eventId)) {
      return;
    }

    const confirmed = await messageBox.confirm({
      title: "Unregister from Event",
      message: "Are you sure you want to unregister from this event?",
      tone: "warning",
    });
    if (!confirmed) return;

    const previousRegistered = new Set(registeredEvents);
    const optimisticRegistered = new Set(previousRegistered);
    optimisticRegistered.delete(eventId);
    setRegisteredEvents(optimisticRegistered);
    persistRegistered(optimisticRegistered);
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
                  isRegistered: true,
                  registered: (event.registered || 0) + 1,
                }
              : event
          )
        );
        await messageBox.alert({
          title: "Sign In Required",
          message: "Please sign in to manage event registrations.",
          tone: "warning",
        });
        return;
      }
      await unregisterFromEvent(eventId, supabaseUserId);
    } catch (err) {
      setRegisteredEvents(previousRegistered);
      persistRegistered(previousRegistered);
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
      await messageBox.alert({
        title: "Unregistration Failed",
        message: err instanceof Error ? err.message : "Failed to unregister from event.",
        tone: "error",
      });
    }
  }

  const filteredEvents =
    activeFilter === "all"
      ? eventsView
      : eventsView.filter((e) => e.event_type.toLowerCase() === activeFilter.toLowerCase());

  const myRegisteredEvents = useMemo(() => {
    return eventsView.filter((event) => registeredEvents.has(event.id) || event.isRegistered);
  }, [eventsView, registeredEvents]);

  const upcomingRegisteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return myRegisteredEvents
      .filter((e) => {
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && d >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [myRegisteredEvents]);

  const unreadCount = useMemo(
    () => upcomingRegisteredEvents.filter((e) => !readNotifications.has(e.id)).length,
    [upcomingRegisteredEvents, readNotifications]
  );

  const handleViewRegisteredEvent = (eventId: string) => {
    setActiveFilter("all");
    setShowMyRegistrations(false);
    setSpotlightEventId(eventId);

    window.setTimeout(() => {
      const target = document.getElementById(`event-card-${eventId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
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

          {/* Notification Bell */}
          <div ref={notifBellRef} className="relative ml-auto">
            <button
              aria-label="Event notifications"
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-[#1B2744]" : "text-gray-500"}`} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-30 overflow-hidden">
                {/* Dropdown Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#1B2744]" />
                    <span className="font-semibold text-sm text-gray-900">Event Reminders</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-96 overflow-y-auto">
                  {upcomingRegisteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm font-medium text-gray-500">No upcoming registered events</p>
                      <p className="text-xs text-gray-400 mt-1">Register for an event to get reminders here</p>
                    </div>
                  ) : (
                    upcomingRegisteredEvents.map((event, idx) => {
                      const { label: daysLabel, urgent } = getDaysUntil(event.date);
                      const isUnread = !readNotifications.has(event.id);
                      const isNearest = idx === 0;
                      return (
                        <button
                          type="button"
                          key={event.id}
                          onClick={() => handleNotifItemClick(event.id)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 ${isUnread ? "bg-blue-50/40" : ""}`}
                        >
                          {/* Unread dot */}
                          <div className="mt-1.5 flex-shrink-0">
                            {isUnread ? (
                              <span className="w-2 h-2 bg-blue-500 rounded-full block" />
                            ) : (
                              <span className="w-2 h-2 rounded-full block" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              {isNearest && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wide">
                                  Next Up
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                event.event_type.toLowerCase() === "job fair" ? "bg-blue-50 text-blue-700" :
                                event.event_type.toLowerCase() === "workshop" ? "bg-cyan-50 text-cyan-700" :
                                event.event_type.toLowerCase() === "seminar" ? "bg-green-50 text-green-700" :
                                event.event_type.toLowerCase() === "webinar" ? "bg-purple-50 text-purple-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {event.event_type}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                {event.date}
                              </span>
                              <span className={`text-xs font-semibold ${urgent ? "text-amber-600" : "text-gray-500"}`}>
                                {daysLabel}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {upcomingRegisteredEvents.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-400 text-center">
                      {upcomingRegisteredEvents.length} upcoming registered event{upcomingRegisteredEvents.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
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
                  onUnregister={() => handleUnregister(event.id)}
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
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewRegisteredEvent(event.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B2744] text-white hover:bg-[#131d33]"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnregister(event.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                            >
                              Unregister
                            </button>
                          </div>
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
  onUnregister,
  cardId,
  spotlighted,
}: {
  event: Event;
  isRegistered: boolean;
  onRegister: () => void;
  onUnregister: () => void;
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
        isRegistered ? (
          <button
            type="button"
            onClick={onUnregister}
            className="w-full py-2.5 rounded-lg font-semibold transition-colors bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          >
            Unregister
          </button>
        ) : (
          <button
            type="button"
            onClick={onRegister}
            className="w-full py-2.5 rounded-lg font-semibold transition-colors bg-[#1B2744] text-white hover:bg-[#131d33]"
          >
            Register Now
          </button>
        )
      )}
    </div>
  );
}

export default function EventsPage() {
  const { user, signOut } = useAuth();
  const { profile } = useStudent();
  const navigate = useNavigate();
  const studentId = profile?.student_number != null ? String(profile.student_number) : '';
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

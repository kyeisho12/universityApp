import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { 
  getEventsForStudent, 
  registerForEvent, 
  unregisterFromEvent,
  EventWithRegistration 
} from "../services/careerEventService";

type NavigateHandler = (route: string) => void;

interface CareerEventsPageContentProps {
  email: string;
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

function CareerEventsPageContent({ email, userId, onLogout, onNavigate }: CareerEventsPageContentProps) {
  const userName = email.split("@")[0];
  const userID = userId;
  const [activeFilter, setActiveFilter] = useState("all");
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      setError(null);
      
      const eventsData = await getEventsForStudent(userID)
      
      // Track which events this student is registered for
      const registered = new Set(
        eventsData
          .filter(e => e.isRegistered)
          .map(e => e.id)
      );
      setRegisteredEvents(registered);
      
      setEvents(eventsData);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "Error fetching events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(eventId: string) {
    try {
      await registerForEvent(eventId, userID)
      
      // Update local state
      setEvents(events.map(e => 
        e.id === eventId 
          ? { ...e, registered: (e.registered || 0) + 1, isRegistered: true }
          : e
      ));
      
      setRegisteredEvents(new Set([...registeredEvents, eventId]));
    } catch (err) {
      console.error('Registration error:', err);
      alert(err instanceof Error ? err.message : 'Failed to register for event');
    }
  }

  async function handleUnregister(eventId: string) {
    try {
      await unregisterFromEvent(eventId, userID)
      
      // Update local state
      setEvents(events.map(e => 
        e.id === eventId 
          ? { ...e, registered: Math.max((e.registered || 1) - 1, 0), isRegistered: false }
          : e
      ));
      
      const newSet = new Set(registeredEvents);
      newSet.delete(eventId);
      setRegisteredEvents(newSet);
    } catch (err) {
      console.error('Unregistration error:', err);
      alert(err instanceof Error ? err.message : 'Failed to unregister from event');
    }
  }

  const filteredEvents =
    activeFilter === "all"
      ? events
      : events.filter((e) => e.event_type.toLowerCase() === activeFilter.toLowerCase());

  const filterOptions = ["all", "job fair", "workshop", "seminar", "webinar", "announcement"];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userID={userID}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="student/events"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search jobs, events, resources..."
              className="w-full px-4 py-2.5 bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
            />
          </div>
          <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
        </div>

        {/* Content Area */}
        <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Career Events</h1>
            <p className="text-gray-500">
              Discover and attend career development events and networking opportunities
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
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
          {!loading && events.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">No events found</p>
            </div>
          )}

          {/* Events Grid */}
          {!loading && events.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isRegistered={registeredEvents.has(event.id)}
                  onRegister={() => handleRegister(event.id)}
                  onUnregister={() => handleUnregister(event.id)}
                />
              ))}
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
}: {
  event: Event;
  isRegistered: boolean;
  onRegister: () => void;
  onUnregister: () => void;
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full">
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
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          {event.date}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          {event.time}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          {event.location}
        </div>
        {event.registered && event.registered > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            {event.registered} registered
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={isRegistered ? onUnregister : onRegister}
        className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${
          isRegistered
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-[#1B2744] text-white hover:bg-[#131d33]"
        }`}
      >
        {isRegistered ? "Cancel Registration" : "Register Now"}
      </button>
    </div>
  );
}

export default function EventsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
      email={user?.email || ""}
      userId={user?.id ?? ""}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}

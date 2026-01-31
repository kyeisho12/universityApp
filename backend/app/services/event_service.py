import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import uuid
import requests
import json

logger = logging.getLogger(__name__)
logger.info("Initializing event_service module")

# Temporary in-memory storage for career events while debugging PostgREST schema cache issue
_events_db: Dict[str, Dict[str, Any]] = {}
# In-memory storage for event registrations: {event_id: [student_ids]}
_registrations_db: Dict[str, List[str]] = {}

# File path for persistent registration storage
import sys
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REGISTRATIONS_FILE = os.path.join(_backend_dir, "data", "registrations.json")
print(f"[INIT] REGISTRATIONS_FILE = {REGISTRATIONS_FILE}", flush=True)

def _ensure_registrations_file():
    """Ensure registrations file exists"""
    os.makedirs(os.path.dirname(REGISTRATIONS_FILE), exist_ok=True)
    if not os.path.exists(REGISTRATIONS_FILE):
        with open(REGISTRATIONS_FILE, 'w') as f:
            json.dump({}, f)

def _load_registrations():
    """Load registrations from file"""
    try:
        _ensure_registrations_file()
        with open(REGISTRATIONS_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading registrations: {e}")
        return {}

def _save_registrations(registrations: Dict[str, List[str]]):
    """Save registrations to file"""
    try:
        print(f"[SAVE] Attempting to save to {REGISTRATIONS_FILE}", flush=True)
        _ensure_registrations_file()
        print(f"[SAVE] File ensured", flush=True)
        with open(REGISTRATIONS_FILE, 'w') as f:
            json.dump(registrations, f, indent=2)
        print(f"[SAVE] Wrote {len(registrations)} events", flush=True)
        logger.info(f"Saved registrations for {len(registrations)} events to {REGISTRATIONS_FILE}")
    except Exception as e:
        print(f"[SAVE] ERROR: {e}", flush=True)
        logger.error(f"Error saving registrations to {REGISTRATIONS_FILE}: {e}")


class EventService:
    """Service for handling career event operations
    
    Note: Currently using in-memory storage due to Supabase PostgREST PGRST205 schema cache issue.
    The career_events table exists in the database but PostgREST cannot find it in its schema cache.
    Once the cache is refreshed on Supabase's side, this can be switched back to REST API calls.
    """

    def __init__(self):
        print(f"[INIT] REGISTRATIONS_FILE = {REGISTRATIONS_FILE}", flush=True)
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.use_mock_data = True  # Temporarily use in-memory storage
        
        # Load persistent registrations from file
        global _registrations_db
        print(f"[INIT] Loading registrations from {REGISTRATIONS_FILE}...", flush=True)
        _registrations_db = _load_registrations()
        print(f"[INIT] Loaded {len(_registrations_db)} events from file", flush=True)
        
        logger.info(f"EventService __init__: SUPABASE_URL={self.supabase_url}, has_key={bool(self.supabase_key)}")
        logger.info(f"Loaded {len(_registrations_db)} events with registrations from file")
        
        if self.supabase_url and self.supabase_key:
            # Use direct REST API endpoint for career_events table
            self.api_url = f"{self.supabase_url}/rest/v1"
            self.headers = {
                "Content-Type": "application/json",
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}"
            }
        else:
            logger.error("SUPABASE_URL and/or SUPABASE_KEY environment variables not set")
            self.api_url = None
            self.headers = None
        
        logger.info("EventService initialized with persistent file storage for registrations")

    def _fetch_event_from_supabase(self, event_id: str) -> Optional[Dict[str, Any]]:
        if not self.api_url or not self.headers:
            return None

        try:
            url = f"{self.api_url}/career_events"
            params = {
                "id": f"eq.{event_id}",
                "limit": "1"
            }
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data[0] if data else None
        except Exception as e:
            logger.error(f"Error fetching event {event_id} from Supabase: {e}", exc_info=True)
            return None

    def create_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new career event
        
        Args:
            event_data: Dictionary containing event information
                - title (required): Event title
                - description (required): Event description
                - event_type (required): Type (Job Fair, Workshop, Seminar, Webinar, Announcement)
                - date (required): Event date (YYYY-MM-DD)
                - time (required): Event time (HH:MM)
                - location (required): Event location
        
        Returns:
            Created event data or error response
        """
        try:
            # Validate required fields
            required_fields = ["title", "description", "event_type", "date", "time", "location"]
            for field in required_fields:
                if not event_data.get(field):
                    return {
                        "success": False,
                        "error": f"Missing required field: {field}",
                        "status_code": 400
                    }

            # Prepare data
            event_id = str(uuid.uuid4())
            data = {
                "id": event_id,
                "title": event_data.get("title").strip(),
                "description": event_data.get("description").strip(),
                "event_type": event_data.get("event_type").strip(),
                "date": event_data.get("date").strip(),
                "time": event_data.get("time").strip(),
                "location": event_data.get("location").strip(),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Store in memory
            _events_db[event_id] = data
            # Initialize empty registrations for this event
            _registrations_db[event_id] = []
            logger.info(f"Created event {event_id} in memory storage")
            
            return {
                "success": True,
                "data": self._add_registration_count(data),
                "status_code": 201
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error creating event: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def get_all_events(self, event_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all career events, optionally filtered by type
        
        Args:
            event_type: Optional filter by event type
        
        Returns:
            List of all events with registration counts
        """
        try:
            # Fetch from Supabase via REST API
            if self.api_url and self.headers:
                url = f"{self.api_url}/career_events"
                params = {}
                if event_type:
                    params["event_type"] = f"eq.{event_type}"
                
                response = requests.get(url, headers=self.headers, params=params, timeout=10)
                response.raise_for_status()
                all_events = response.json()
                
                logger.info(f"Fetched {len(all_events)} career events from Supabase")
            else:
                # Fallback to memory storage if Supabase not configured
                all_events = list(_events_db.values())
                
                if event_type:
                    all_events = [e for e in all_events if e.get("event_type") == event_type]
                
                logger.info(f"Fetched {len(all_events)} career events from memory storage")
            
            # Add registration count to each event
            all_events = [self._add_registration_count(e) for e in all_events]
            
            # Sort by date descending
            all_events.sort(key=lambda x: x.get("date", ""), reverse=True)
            
            return {
                "success": True,
                "data": all_events,
                "count": len(all_events),
                "status_code": 200
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error fetching events: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def get_event_by_id(self, event_id: str) -> Dict[str, Any]:
        """
        Get a specific event by ID
        
        Args:
            event_id: UUID of the event
        
        Returns:
            Event data with registration count or error response
        """
        try:
            event = self._fetch_event_from_supabase(event_id)
            if not event:
                if event_id in _events_db:
                    event = _events_db[event_id]
                else:
                    return {
                        "success": False,
                        "error": "Event not found",
                        "status_code": 404
                    }

            event = self._add_registration_count(event)
            return {
                "success": True,
                "data": event,
                "status_code": 200
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error fetching event: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def update_event(self, event_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing career event
        
        Args:
            event_id: UUID of the event
            event_data: Dictionary with fields to update
        
        Returns:
            Updated event data or error response
        """
        try:
            if event_id not in _events_db:
                return {
                    "success": False,
                    "error": "Event not found",
                    "status_code": 404
                }
            
            # Update fields
            event = _events_db[event_id]
            
            if "title" in event_data and event_data["title"]:
                event["title"] = event_data["title"].strip()
            if "description" in event_data and event_data["description"]:
                event["description"] = event_data["description"].strip()
            if "event_type" in event_data and event_data["event_type"]:
                event["event_type"] = event_data["event_type"].strip()
            if "date" in event_data and event_data["date"]:
                event["date"] = event_data["date"].strip()
            if "time" in event_data and event_data["time"]:
                event["time"] = event_data["time"].strip()
            if "location" in event_data and event_data["location"]:
                event["location"] = event_data["location"].strip()
            
            event["updated_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Updated event {event_id} in memory storage")
            
            return {
                "success": True,
                "data": self._add_registration_count(event),
                "status_code": 200
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error updating event: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def delete_event(self, event_id: str) -> Dict[str, Any]:
        """
        Delete a career event
        
        Args:
            event_id: UUID of the event to delete
        
        Returns:
            Success response or error
        """
        try:
            if event_id in _events_db:
                del _events_db[event_id]
                # Also delete registrations for this event
                if event_id in _registrations_db:
                    del _registrations_db[event_id]
                    _save_registrations(_registrations_db)  # Persist deletion
                logger.info(f"Deleted event {event_id} from memory storage")
                return {
                    "success": True,
                    "message": "Event deleted successfully",
                    "status_code": 200
                }
            else:
                return {
                    "success": False,
                    "error": "Event not found",
                    "status_code": 404
                }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error deleting event: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def register_for_event(self, event_id: str, student_id: str) -> Dict[str, Any]:
        """
        Register a student for an event
        
        Args:
            event_id: UUID of the event
            student_id: ID of the student registering
        
        Returns:
            Updated event data or error response
        """
        try:
            event = self._fetch_event_from_supabase(event_id)
            if not event:
                if event_id in _events_db:
                    event = _events_db[event_id]
                else:
                    return {
                        "success": False,
                        "error": "Event not found",
                        "status_code": 404
                    }
            
            # Initialize registrations list if needed
            if event_id not in _registrations_db:
                _registrations_db[event_id] = []
            
            # Add student if not already registered
            print(f"[REG] Checking if {student_id} in {_registrations_db[event_id]}", flush=True)
            if student_id not in _registrations_db[event_id]:
                print(f"[REG] Adding student", flush=True)
                _registrations_db[event_id].append(student_id)
                _save_registrations(_registrations_db)  # Persist to file
                logger.info(f"Student {student_id} registered for event {event_id}")
            else:
                print(f"[REG] Student already registered, skipping save", flush=True)
            
            event = self._add_registration_count(event)
            return {
                "success": True,
                "data": event,
                "status_code": 200
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error registering for event: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def unregister_from_event(self, event_id: str, student_id: str) -> Dict[str, Any]:
        """
        Unregister a student from an event
        
        Args:
            event_id: UUID of the event
            student_id: ID of the student unregistering
        
        Returns:
            Updated event data or error response
        """
        try:
            event = self._fetch_event_from_supabase(event_id)
            if not event:
                if event_id in _events_db:
                    event = _events_db[event_id]
                else:
                    return {
                        "success": False,
                        "error": "Event not found",
                        "status_code": 404
                    }
            
            # Initialize registrations list if needed
            if event_id not in _registrations_db:
                _registrations_db[event_id] = []
            
            # Remove student if registered
            if student_id in _registrations_db[event_id]:
                _registrations_db[event_id].remove(student_id)
                _save_registrations(_registrations_db)  # Persist to file
                logger.info(f"Student {student_id} unregistered from event {event_id}")
            
            event = self._add_registration_count(event)
            return {
                "success": True,
                "data": event,
                "status_code": 200
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error unregistering from event: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def _add_registration_count(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Helper method to add registration count to event data
        
        Args:
            event: Event dictionary
        
        Returns:
            Event dictionary with registered count and list of registered students
        """
        event_copy = event.copy()
        event_id = event_copy.get("id")
        registered_students = _registrations_db.get(event_id, [])
        event_copy["registered"] = len(registered_students)
        event_copy["registered_students"] = registered_students  # Include list of registered students
        return event_copy

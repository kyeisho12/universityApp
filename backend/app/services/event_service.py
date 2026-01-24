import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import uuid
import requests
import json

logger = logging.getLogger(__name__)

# Temporary in-memory storage for career events while debugging PostgREST schema cache issue
_events_db: Dict[str, Dict[str, Any]] = {}
# In-memory storage for event registrations: {event_id: [student_ids]}
_registrations_db: Dict[str, List[str]] = {}


class EventService:
    """Service for handling career event operations
    
    Note: Currently using in-memory storage due to Supabase PostgREST PGRST205 schema cache issue.
    The career_events table exists in the database but PostgREST cannot find it in its schema cache.
    Once the cache is refreshed on Supabase's side, this can be switched back to REST API calls.
    """

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.use_mock_data = True  # Temporarily use in-memory storage
        
        logger.info(f"EventService __init__: SUPABASE_URL={self.supabase_url}, has_key={bool(self.supabase_key)}")
        
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
        
        logger.info("EventService initialized with in-memory storage (PostgREST cache workaround)")

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
            # Get all events from memory storage
            all_events = list(_events_db.values())
            
            # Filter by event_type if provided
            if event_type:
                all_events = [e for e in all_events if e.get("event_type") == event_type]
            
            # Add registration count to each event
            all_events = [self._add_registration_count(e) for e in all_events]
            
            # Sort by date descending
            all_events.sort(key=lambda x: x.get("date", ""), reverse=True)
            
            logger.info(f"Fetched {len(all_events)} career events from memory storage")
            
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
            if event_id in _events_db:
                event = self._add_registration_count(_events_db[event_id])
                return {
                    "success": True,
                    "data": event,
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
            if event_id not in _events_db:
                return {
                    "success": False,
                    "error": "Event not found",
                    "status_code": 404
                }
            
            # Initialize registrations list if needed
            if event_id not in _registrations_db:
                _registrations_db[event_id] = []
            
            # Add student if not already registered
            if student_id not in _registrations_db[event_id]:
                _registrations_db[event_id].append(student_id)
                logger.info(f"Student {student_id} registered for event {event_id}")
            
            event = self._add_registration_count(_events_db[event_id])
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
            if event_id not in _events_db:
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
                logger.info(f"Student {student_id} unregistered from event {event_id}")
            
            event = self._add_registration_count(_events_db[event_id])
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
            Event dictionary with registered count
        """
        event_copy = event.copy()
        event_id = event_copy.get("id")
        event_copy["registered"] = len(_registrations_db.get(event_id, []))
        return event_copy

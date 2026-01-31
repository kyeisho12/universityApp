from flask import Blueprint, jsonify, request
from app.services.event_service import EventService
from functools import wraps

events_bp = Blueprint("events", __name__)
_event_service = None


def get_event_service():
    """Lazy load event service on first use"""
    global _event_service
    if _event_service is None:
        _event_service = EventService()
    return _event_service


def require_admin(f):
    """Decorator to check if user is admin (placeholder - implement with real auth)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement real admin verification using JWT tokens
        return f(*args, **kwargs)
    return decorated_function


@events_bp.route("/", methods=["GET"])
def get_events():
    """
    Get all career events
    Query params:
        - event_type: filter by event type (Job Fair, Workshop, Seminar, Webinar, Announcement)
        - student_id: student ID to check registration status
    """
    try:
        event_type = request.args.get("event_type", None)
        student_id = request.args.get("student_id", None)
        result = get_event_service().get_all_events(event_type=event_type)
        
        # Add isRegistered flag for each event if student_id provided
        if student_id and result.get("success") and "data" in result:
            for event in result["data"]:
                registered_students = event.get("registered_students", [])
                event["isRegistered"] = student_id in registered_students
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@events_bp.route("/", methods=["POST"])
@require_admin
def create_event():
    """Create a new career event (admin only)"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_event_service().create_event(data)
        
        return jsonify(result), result.get("status_code", 201)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# Registration routes must come BEFORE generic /<event_id> routes
@events_bp.route("/<event_id>/register", methods=["POST"])
def register_for_event(event_id):
    """Register a student for an event"""
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get("student_id", "anonymous")
        
        result = get_event_service().register_for_event(event_id, student_id)
        
        # Add isRegistered flag
        if result.get("success") and "data" in result:
            registered_students = result["data"].get("registered_students", [])
            result["data"]["isRegistered"] = student_id in registered_students
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@events_bp.route("/<event_id>/unregister", methods=["POST"])
def unregister_from_event(event_id):
    """Unregister a student from an event"""
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get("student_id", "anonymous")
        
        result = get_event_service().unregister_from_event(event_id, student_id)
        
        # Add isRegistered flag
        if result.get("success") and "data" in result:
            registered_students = result["data"].get("registered_students", [])
            result["data"]["isRegistered"] = student_id in registered_students
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# Generic event routes
@events_bp.route("/<event_id>", methods=["GET"])
def get_event(event_id):
    """Get a specific event by ID"""
    try:
        result = get_event_service().get_event_by_id(event_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@events_bp.route("/<event_id>", methods=["PUT"])
@require_admin
def update_event(event_id):
    """Update a career event (admin only)"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_event_service().update_event(event_id, data)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@events_bp.route("/<event_id>", methods=["DELETE"])
@require_admin
def delete_event(event_id):
    """Delete a career event (admin only)"""
    try:
        result = get_event_service().delete_event(event_id)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

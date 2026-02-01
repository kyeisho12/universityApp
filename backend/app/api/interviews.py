from flask import Blueprint, jsonify, request
from app.services.interview_service import InterviewService
from functools import wraps

interviews_bp = Blueprint("interviews", __name__)
_interview_service = None


def get_interview_service():
    """Lazy load interview service on first use"""
    global _interview_service
    if _interview_service is None:
        _interview_service = InterviewService()
    return _interview_service


def require_auth(f):
    """Decorator to check if user is authenticated (placeholder - implement with real auth)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement real authentication using JWT tokens
        return f(*args, **kwargs)
    return decorated_function


@interviews_bp.route("/user/<user_id>", methods=["GET"])
def get_user_interviews(user_id):
    """Get all interviews for a specific user"""
    try:
        status = request.args.get("status", None)
        result = get_interview_service().get_user_interviews(user_id, status=status)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/user/<user_id>/count", methods=["GET"])
def get_user_interviews_count(user_id):
    """Get the count of interviews for a specific user"""
    try:
        status = request.args.get("status", None)
        result = get_interview_service().get_user_interviews_count(user_id, status=status)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/<interview_id>", methods=["GET"])
def get_interview(interview_id):
    """Get a specific interview by ID"""
    try:
        result = get_interview_service().get_interview_by_id(interview_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/", methods=["POST"])
@require_auth
def create_interview():
    """Create a new interview record"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_interview_service().create_interview(data)
        
        return jsonify(result), result.get("status_code", 201)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/<interview_id>", methods=["PUT"])
@require_auth
def update_interview(interview_id):
    """Update an interview record"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_interview_service().update_interview(interview_id, data)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/<interview_id>", methods=["DELETE"])
@require_auth
def delete_interview(interview_id):
    """Delete an interview record"""
    try:
        result = get_interview_service().delete_interview(interview_id)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

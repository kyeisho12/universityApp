from flask import Blueprint, jsonify, request
from app.services.resume_service import ResumeService
from functools import wraps

resumes_bp = Blueprint("resumes", __name__)
_resume_service = None


def get_resume_service():
    """Lazy load resume service on first use"""
    global _resume_service
    if _resume_service is None:
        _resume_service = ResumeService()
    return _resume_service


def require_auth(f):
    """Decorator to check if user is authenticated (placeholder - implement with real auth)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement real authentication using JWT tokens
        return f(*args, **kwargs)
    return decorated_function


@resumes_bp.route("/user/<user_id>", methods=["GET"])
def get_user_resumes(user_id):
    """Get all resumes for a specific user"""
    try:
        result = get_resume_service().get_user_resumes(user_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@resumes_bp.route("/<resume_id>", methods=["GET"])
def get_resume(resume_id):
    """Get a specific resume by ID"""
    try:
        result = get_resume_service().get_resume_by_id(resume_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@resumes_bp.route("/", methods=["POST"])
@require_auth
def create_resume():
    """Create a resume record (file upload handled by frontend to storage)"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_resume_service().create_resume(data)
        
        return jsonify(result), result.get("status_code", 201)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@resumes_bp.route("/<resume_id>", methods=["PUT"])
@require_auth
def update_resume(resume_id):
    """Update a resume record"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_resume_service().update_resume(resume_id, data)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@resumes_bp.route("/<resume_id>", methods=["DELETE"])
@require_auth
def delete_resume(resume_id):
    """Delete a resume record"""
    try:
        result = get_resume_service().delete_resume(resume_id)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@resumes_bp.route("/user/<user_id>/count", methods=["GET"])
def get_user_resumes_count(user_id):
    """Get the count of resumes for a specific user"""
    try:
        result = get_resume_service().get_user_resumes_count(user_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

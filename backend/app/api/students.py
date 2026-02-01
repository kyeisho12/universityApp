from flask import Blueprint, jsonify, request
from app.services.student_service import StudentService
from functools import wraps

students_bp = Blueprint("students", __name__)
_student_service = None


def get_student_service():
    """Lazy load student service on first use"""
    global _student_service
    if _student_service is None:
        _student_service = StudentService()
    return _student_service


def require_admin(f):
    """Decorator to check if user is admin (placeholder - implement with real auth)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement real admin verification using JWT tokens
        return f(*args, **kwargs)
    return decorated_function


@students_bp.route("/", methods=["GET"])
@require_admin
def get_students():
    """Get all students with optional filtering"""
    try:
        search = request.args.get("search", None)
        status = request.args.get("status", None)
        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)
        
        result = get_student_service().get_all_students(
            search=search,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@students_bp.route("/<student_id>", methods=["GET"])
@require_admin
def get_student(student_id):
    """Get a specific student by ID"""
    try:
        result = get_student_service().get_student_by_id(student_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@students_bp.route("/<student_id>/profile", methods=["GET"])
@require_admin
def get_student_profile(student_id):
    """Get full student profile with statistics"""
    try:
        result = get_student_service().get_student_profile(student_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@students_bp.route("/<student_id>", methods=["PUT"])
@require_admin
def update_student(student_id):
    """Update student profile (admin only)"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_student_service().update_student(student_id, data)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@students_bp.route("/<student_id>", methods=["DELETE"])
@require_admin
def delete_student(student_id):
    """Delete a student (admin only)"""
    try:
        result = get_student_service().delete_student(student_id)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@students_bp.route("/count", methods=["GET"])
@require_admin
def get_students_count():
    """Get total students count"""
    try:
        result = get_student_service().get_students_count()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@students_bp.route("/stats/overview", methods=["GET"])
@require_admin
def get_students_stats():
    """Get student statistics overview"""
    try:
        result = get_student_service().get_students_stats()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

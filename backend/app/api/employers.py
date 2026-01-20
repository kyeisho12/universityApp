from flask import Blueprint, jsonify, request
from app.services.employer_service import EmployerService
from functools import wraps

employers_bp = Blueprint("employers", __name__)
employer_service = EmployerService()


def require_admin(f):
    """Decorator to check if user is admin (placeholder - implement with real auth)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement real admin verification using JWT tokens
        # For now, we'll allow all requests - add proper auth later
        return f(*args, **kwargs)
    return decorated_function


@employers_bp.route("/", methods=["GET"])
def get_employers():
    """
    Get all employers
    Query params:
        - include_unverified: 'true' to include unverified employers (admin only)
    """
    try:
        include_unverified = request.args.get("include_unverified", "false").lower() == "true"
        result = employer_service.get_all_employers(include_unverified=include_unverified)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@employers_bp.route("/<employer_id>", methods=["GET"])
def get_employer(employer_id):
    """Get a specific employer by ID"""
    try:
        result = employer_service.get_employer_by_id(employer_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@employers_bp.route("/", methods=["POST"])
@require_admin
def create_employer():
    """Create a new employer"""
    try:
        data = request.get_json(silent=True) or {}
        result = employer_service.create_employer(data)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@employers_bp.route("/<employer_id>", methods=["PUT"])
@require_admin
def update_employer(employer_id):
    """Update an existing employer"""
    try:
        data = request.get_json(silent=True) or {}
        result = employer_service.update_employer(employer_id, data)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@employers_bp.route("/<employer_id>", methods=["DELETE"])
@require_admin
def delete_employer(employer_id):
    """Delete an employer"""
    try:
        result = employer_service.delete_employer(employer_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@employers_bp.route("/search", methods=["GET"])
def search_employers():
    """
    Search employers
    Query params:
        - q: search query (required)
        - include_unverified: 'true' to include unverified (admin only)
    """
    try:
        query = request.args.get("q", "").strip()
        
        if not query:
            return jsonify({
                "success": False,
                "error": "Search query required",
                "status_code": 400
            }), 400
        
        include_unverified = request.args.get("include_unverified", "false").lower() == "true"
        result = employer_service.search_employers(query, include_unverified=include_unverified)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@employers_bp.route("/<employer_id>/verify", methods=["PUT"])
@require_admin
def verify_employer(employer_id):
    """Verify an employer (admin only)"""
    try:
        result = employer_service.verify_employer(employer_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@employers_bp.route("/stats", methods=["GET"])
def get_stats():
    """Get employer statistics"""
    try:
        result = employer_service.get_stats()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

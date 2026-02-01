from flask import Blueprint, jsonify, request
from app.services.job_service import JobService
from functools import wraps

jobs_bp = Blueprint("jobs", __name__)
_job_service = None


def get_job_service():
    """Lazy load job service on first use"""
    global _job_service
    if _job_service is None:
        _job_service = JobService()
    return _job_service


def require_admin(f):
    """Decorator to check if user is admin (placeholder - implement with real auth)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement real admin verification using JWT tokens
        return f(*args, **kwargs)
    return decorated_function


@jobs_bp.route("/", methods=["GET"])
def get_jobs():
    """
    Get all jobs with optional filtering
    Query params:
        - status: filter by status (active, closed, archived) - defaults to active
        - category: filter by category
        - job_type: filter by job type (Full-time, Part-time, Internship, Contract)
        - location: filter by location
        - include_inactive: if true, include inactive jobs (admin only)
    """
    try:
        status = request.args.get("status", "active")
        category = request.args.get("category", None)
        job_type = request.args.get("job_type", None)
        location = request.args.get("location", None)
        include_inactive = request.args.get("include_inactive", "false").lower() == "true"
        
        result = get_job_service().get_all_jobs(
            status=status if not include_inactive else None,
            category=category,
            job_type=job_type,
            location=location
        )
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@jobs_bp.route("/by-employer/<employer_id>", methods=["GET"])
def get_jobs_by_employer(employer_id):
    """Get jobs posted by a specific employer"""
    try:
        status = request.args.get("status", "active")
        include_inactive = request.args.get("include_inactive", "false").lower() == "true"
        
        result = get_job_service().get_jobs_by_employer(
            employer_id,
            status=status if not include_inactive else None
        )
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@jobs_bp.route("/<job_id>", methods=["GET"])
def get_job(job_id):
    """Get a specific job by ID"""
    try:
        result = get_job_service().get_job_by_id(job_id)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@jobs_bp.route("/", methods=["POST"])
@require_admin
def create_job():
    """Create a new job posting (admin only)"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_job_service().create_job(data)
        
        return jsonify(result), result.get("status_code", 201)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@jobs_bp.route("/<job_id>", methods=["PUT"])
@require_admin
def update_job(job_id):
    """Update a job posting (admin only)"""
    try:
        data = request.get_json(silent=True) or {}
        result = get_job_service().update_job(job_id, data)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@jobs_bp.route("/<job_id>", methods=["DELETE"])
@require_admin
def delete_job(job_id):
    """Delete a job posting (admin only)"""
    try:
        result = get_job_service().delete_job(job_id)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@jobs_bp.route("/search", methods=["GET"])
def search_jobs():
    """Search jobs by keyword"""
    try:
        keyword = request.args.get("q", "")
        
        if not keyword:
            return jsonify({
                "success": False,
                "error": "Search keyword is required"
            }), 400
        
        result = get_job_service().search_jobs(keyword)
        
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

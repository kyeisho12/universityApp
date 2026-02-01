from flask import Blueprint, jsonify, request
from app.services.analytics_service import AnalyticsService
from functools import wraps

analytics_bp = Blueprint("analytics", __name__)
_analytics_service = None


def get_analytics_service():
    """Lazy load analytics service on first use"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service


def require_admin(f):
    """Decorator to check if user is admin (placeholder - implement with real auth)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement real admin verification using JWT tokens
        return f(*args, **kwargs)
    return decorated_function


@analytics_bp.route("/dashboard-metrics", methods=["GET"])
@require_admin
def get_dashboard_metrics():
    """Get all dashboard metrics for admin dashboard"""
    try:
        result = get_analytics_service().get_dashboard_metrics()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/students/count", methods=["GET"])
@require_admin
def get_students_count():
    """Get total students count"""
    try:
        result = get_analytics_service().get_students_count()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/employers/count", methods=["GET"])
@require_admin
def get_employers_count():
    """Get total employers/partner companies count"""
    try:
        result = get_analytics_service().get_employers_count()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/interviews/count", methods=["GET"])
@require_admin
def get_interviews_count():
    """Get total completed interviews count"""
    try:
        status = request.args.get("status", "completed")
        result = get_analytics_service().get_interviews_count(status=status)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/events/count", methods=["GET"])
@require_admin
def get_events_count():
    """Get active events count"""
    try:
        result = get_analytics_service().get_events_count()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/recent-activity", methods=["GET"])
@require_admin
def get_recent_activity():
    """Get recent activity feed"""
    try:
        limit = request.args.get("limit", 10, type=int)
        result = get_analytics_service().get_recent_activity(limit=limit)
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/user-stats", methods=["GET"])
@require_admin
def get_user_stats():
    """Get user statistics by role"""
    try:
        result = get_analytics_service().get_user_stats()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/job-stats", methods=["GET"])
@require_admin
def get_job_stats():
    """Get job statistics"""
    try:
        result = get_analytics_service().get_job_stats()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@analytics_bp.route("/applications/count", methods=["GET"])
@require_admin
def get_applications_count():
    """Get total job applications count"""
    try:
        result = get_analytics_service().get_applications_count()
        return jsonify(result), result.get("status_code", 200)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

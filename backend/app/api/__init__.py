from flask import Blueprint, jsonify
from .auth import auth_bp
from .employers import employers_bp
from .events import events_bp
from .jobs import jobs_bp
from .resumes import resumes_bp
from .interviews import interviews_bp
from .analytics import analytics_bp
from .students import students_bp
from .applications import applications_bp

api_bp = Blueprint("api", __name__)


# Sub-blueprints
api_bp.register_blueprint(auth_bp, url_prefix="/auth")
api_bp.register_blueprint(employers_bp, url_prefix="/employers")
api_bp.register_blueprint(events_bp, url_prefix="/events")
api_bp.register_blueprint(jobs_bp, url_prefix="/jobs")
api_bp.register_blueprint(resumes_bp, url_prefix="/resumes")
api_bp.register_blueprint(interviews_bp, url_prefix="/interviews")
api_bp.register_blueprint(analytics_bp, url_prefix="/analytics")
api_bp.register_blueprint(students_bp, url_prefix="/students")
api_bp.register_blueprint(applications_bp, url_prefix="/applications")


@api_bp.route("/health", methods=["GET"])
def health():
	return jsonify({"status": "ok"}), 200


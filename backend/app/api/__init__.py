from flask import Blueprint, jsonify
from .auth import auth_bp
from .employers import employers_bp

api_bp = Blueprint("api", __name__)


# Sub-blueprints
api_bp.register_blueprint(auth_bp, url_prefix="/auth")
api_bp.register_blueprint(employers_bp, url_prefix="/employers")


@api_bp.route("/health", methods=["GET"])
def health():
	return jsonify({"status": "ok"}), 200


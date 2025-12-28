from flask import Blueprint, jsonify, request

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/ping", methods=["GET"])
def ping():
	return jsonify({"message": "auth service up"}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
	data = request.get_json(silent=True) or {}
	email = data.get("email")
	password = data.get("password")
	if not email or not password:
		return jsonify({"error": "email and password required"}), 400
	# Placeholder response; integrate real auth later
	return jsonify({"token": "dev-token", "user": {"email": email}}), 200


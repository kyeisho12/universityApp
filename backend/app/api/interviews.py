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


@interviews_bp.route("/sessions/start", methods=["POST"])
@require_auth
def start_session():
    """Start an interview session (parent record for segmented clips)."""
    try:
        data = request.get_json(silent=True) or {}
        result = get_interview_service().start_session(data)
        return jsonify(result), result.get("status_code", 201)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    """Get an interview session by ID."""
    try:
        result = get_interview_service().get_session_by_id(session_id)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>/pause", methods=["POST"])
@require_auth
def pause_session(session_id):
    """Pause interview session."""
    try:
        result = get_interview_service().pause_session(session_id)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>/resume", methods=["POST"])
@require_auth
def resume_session(session_id):
    """Resume interview session."""
    try:
        result = get_interview_service().resume_session(session_id)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>/end", methods=["POST"])
@require_auth
def end_session(session_id):
    """End interview session."""
    try:
        data = request.get_json(silent=True) or {}
        result = get_interview_service().end_session(session_id, data=data)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>/progress", methods=["PUT"])
@require_auth
def update_session_progress(session_id):
    """Update current question progress in interview session."""
    try:
        data = request.get_json(silent=True) or {}
        if "current_question_index" not in data:
            return jsonify({
                "success": False,
                "error": "Missing required field: current_question_index"
            }), 400

        result = get_interview_service().update_session_progress(
            session_id,
            current_question_index=data.get("current_question_index", 0)
        )
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>/segments", methods=["POST"])
@require_auth
def add_recording_segment(session_id):
    """Save metadata for one session segment clip."""
    try:
        data = request.get_json(silent=True) or {}
        result = get_interview_service().add_recording_segment(session_id, data)
        return jsonify(result), result.get("status_code", 201)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>/segments", methods=["GET"])
def get_session_segments(session_id):
    """Get segment list for one interview session."""
    try:
        result = get_interview_service().get_session_segments(session_id)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/sessions/<session_id>/segments/<segment_id>/transcribe", methods=["POST"])
@require_auth
def transcribe_segment(session_id, segment_id):
    """Trigger Whisper transcription for one uploaded segment."""
    try:
        data = request.get_json(silent=True) or {}
        force = bool(data.get("force", False))
        result = get_interview_service().transcribe_segment(segment_id, force=force)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/transcribe-live", methods=["POST"])
@require_auth
def transcribe_live_audio():
    """Transcribe a short live audio chunk while recording continues."""
    try:
        audio_file = request.files.get("audio")
        if not audio_file:
            return jsonify({
                "success": False,
                "error": "Missing audio file in form-data field 'audio'"
            }), 400

        audio_bytes = audio_file.read()
        if not audio_bytes:
            return jsonify({
                "success": False,
                "error": "Uploaded audio file is empty"
            }), 400

        language = request.form.get("language", "en")
        filename = audio_file.filename or "live_chunk.webm"
        mime_type = audio_file.mimetype or "audio/webm"

        transcribe_result = get_interview_service().whisper_transcriber.transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            filename=filename,
            mime_type=mime_type,
            language=language,
        )

        if not transcribe_result.get("success"):
            return jsonify({
                "success": False,
                "error": transcribe_result.get("error", "Live transcription failed")
            }), transcribe_result.get("status_code", 500)

        return jsonify({
            "success": True,
            "data": {
                "transcript_text": (transcribe_result.get("transcript_text") or "").strip(),
                "raw": transcribe_result.get("raw") or {},
            }
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/follow-up-question", methods=["POST"])
@require_auth
def generate_followup_question():
    """Generate one interview follow-up question using local Phi-3."""
    try:
        data = request.get_json(silent=True) or {}
        result = get_interview_service().generate_followup_question(data)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@interviews_bp.route("/next-question-decision", methods=["POST"])
@interviews_bp.route("/flow/next-question-decision", methods=["POST"])
@require_auth
def decide_next_question():
    """Decide next interview step: follow-up question or next bank question."""
    try:
        data = request.get_json(silent=True) or {}
        result = get_interview_service().decide_next_question(data)
        return jsonify(result), result.get("status_code", 200)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

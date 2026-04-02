from flask import Blueprint, jsonify, request
from app.services.resume_service import ResumeService
from functools import wraps
import io
import re

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


SKILL_KEYWORDS = [
    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
    'node', 'html', 'css', 'sql', 'mysql', 'postgresql', 'mongodb', 'git',
    'docker', 'kubernetes', 'aws', 'azure', 'linux', 'c++', 'c#', 'php',
    'rest api', 'machine learning', 'data analysis', 'figma', 'photoshop',
    'excel', 'powerpoint', 'word', 'microsoft office', 'agile', 'scrum',
    'communication', 'leadership', 'teamwork', 'problem solving',
    'project management', 'teaching', 'curriculum', 'child development',
]


def _extract_text_from_file(file) -> str:
    """Extract plain text from PDF or DOCX file object."""
    filename = (file.filename or '').lower()
    file_bytes = file.read()

    if filename.endswith('.pdf'):
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return '\n'.join(page.extract_text() or '' for page in pdf.pages)

    if filename.endswith('.docx'):
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return '\n'.join(para.text for para in doc.paragraphs)

    # DOC or unknown — best-effort UTF-8 decode
    return file_bytes.decode('utf-8', errors='ignore')


def _extract_skills(text: str) -> list:
    text_lower = text.lower()
    return [skill for skill in SKILL_KEYWORDS if skill in text_lower]


def _extract_ratings(text: str) -> dict:
    ratings = {}
    for match in re.finditer(r'([\w ]+?)\s*[:\-]\s*(\d+)\s*/\s*(\d+)', text):
        key = match.group(1).strip().lower()
        ratings[key] = f'{match.group(2)}/{match.group(3)}'
    for match in re.finditer(r'([\w ]+?)\s*[:\-]\s*(\d+)\s*%', text):
        key = match.group(1).strip().lower()
        ratings.setdefault(key, match.group(2))
    return ratings


@resumes_bp.route("/parse", methods=["POST"])
def parse_resume():
    """Extract text, skills, and ratings from an uploaded resume file."""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({"success": False, "error": "No file selected"}), 400

        resume_text = _extract_text_from_file(file)
        skills = _extract_skills(resume_text)
        ratings = _extract_ratings(resume_text)

        return jsonify({
            "success": True,
            "resume_text": resume_text,
            "skills": skills,
            "ratings": ratings,
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "resume_text": "",
            "skills": [],
            "ratings": {},
        }), 500


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

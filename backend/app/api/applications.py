from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from app.services.application_service import ApplicationService
from functools import wraps

applications_bp = Blueprint('applications', __name__)
application_service = ApplicationService()

def get_auth_token():
    """Extract auth token from request headers"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None

@applications_bp.route('/apply', methods=['POST'])
@cross_origin()
def submit_application():
    """Submit a job application"""
    try:
        data = request.get_json()
        auth_token = get_auth_token()
        
        required_fields = ['student_id', 'job_id', 'employer_id']
        if not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: student_id, job_id, employer_id',
                'status_code': 400
            }), 400
        
        cover_letter = data.get('cover_letter')
        resume_id = data.get('resume_id')
        
        result = application_service.submit_application(
            student_id=data['student_id'],
            job_id=data['job_id'],
            employer_id=data['employer_id'],
            cover_letter=cover_letter,
            resume_id=resume_id,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 201 if result.get('success') else 400)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/student/<student_id>', methods=['GET'])
@cross_origin()
def get_student_applications(student_id):
    """Get all applications for a student"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        auth_token = get_auth_token()
        
        result = application_service.get_student_applications(
            student_id=student_id,
            limit=limit,
            offset=offset,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/job/<job_id>', methods=['GET'])
@cross_origin()
def get_job_applications(job_id):
    """Get all applications for a specific job"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        auth_token = get_auth_token()
        
        result = application_service.get_job_applications(
            job_id=job_id,
            limit=limit,
            offset=offset,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/', methods=['GET'])
@cross_origin()
def get_all_applications():
    """Get all applications (admin view)"""
    try:
        status = request.args.get('status')
        employer_id = request.args.get('employer_id')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        auth_token = get_auth_token()
        
        result = application_service.get_all_applications(
            status=status,
            employer_id=employer_id,
            limit=limit,
            offset=offset,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/<application_id>', methods=['GET'])
@cross_origin()
def get_application(application_id):
    """Get a specific application"""
    try:
        auth_token = get_auth_token()
        
        result = application_service.get_application_by_id(
            application_id=application_id,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/<application_id>/status', methods=['PUT'])
@cross_origin()
def update_application_status(application_id):
    """Update application status (admin only)"""
    try:
        data = request.get_json()
        auth_token = get_auth_token()
        
        if 'status' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: status',
                'status_code': 400
            }), 400
        
        valid_statuses = ['pending', 'accepted', 'rejected', 'withdrawn']
        if data['status'] not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}',
                'status_code': 400
            }), 400
        
        notes = data.get('notes')
        reviewed_by = data.get('reviewed_by')
        
        result = application_service.update_application_status(
            application_id=application_id,
            status=data['status'],
            notes=notes,
            reviewed_by=reviewed_by,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/check/<student_id>/<job_id>', methods=['GET'])
@cross_origin()
def check_if_applied(student_id, job_id):
    """Check if student has already applied to a job"""
    try:
        auth_token = get_auth_token()
        
        result = application_service.check_if_applied(
            student_id=student_id,
            job_id=job_id,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/stats', methods=['GET'])
@cross_origin()
def get_application_stats():
    """Get application statistics"""
    try:
        auth_token = get_auth_token()
        
        result = application_service.get_application_stats(auth_token=auth_token)
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

@applications_bp.route('/<application_id>', methods=['DELETE'])
@cross_origin()
def withdraw_application(application_id):
    """Withdraw an application"""
    try:
        auth_token = get_auth_token()
        
        result = application_service.delete_application(
            application_id=application_id,
            auth_token=auth_token
        )
        
        status_code = result.pop('status_code', 200)
        return jsonify(result), status_code
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status_code': 500
        }), 500

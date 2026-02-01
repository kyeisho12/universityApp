import os
import requests
from typing import Optional, List, Dict, Any
from datetime import datetime

class ApplicationService:
    """Service for managing job applications"""
    
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_KEY')
        self.headers = {
            'apikey': self.supabase_key,
            'Content-Type': 'application/json'
        }
    
    def submit_application(self, student_id: str, job_id: str, employer_id: str, 
                          cover_letter: Optional[str] = None, 
                          resume_id: Optional[str] = None,
                          auth_token: str = None) -> Dict[str, Any]:
        """Submit a job application"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            data = {
                'student_id': student_id,
                'job_id': job_id,
                'employer_id': employer_id,
                'status': 'pending',
                'application_date': datetime.utcnow().isoformat(),
                'cover_letter': cover_letter,
                'resume_id': resume_id
            }
            
            response = requests.post(
                f'{self.supabase_url}/rest/v1/applications',
                json=data,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                return {
                    'success': True,
                    'data': response.json()[0] if isinstance(response.json(), list) else response.json(),
                    'message': 'Application submitted successfully'
                }
            else:
                return {
                    'success': False,
                    'error': response.json().get('message', 'Failed to submit application'),
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def get_student_applications(self, student_id: str, limit: int = 50, 
                                offset: int = 0, auth_token: str = None) -> Dict[str, Any]:
        """Get all applications for a student"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            query = f'student_id=eq.{student_id}&limit={limit}&offset={offset}&order=application_date.desc'
            
            response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?{query}',
                headers=headers
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json(),
                    'count': len(response.json()),
                    'status_code': 200
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to fetch applications',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def get_job_applications(self, job_id: str, limit: int = 50, 
                            offset: int = 0, auth_token: str = None) -> Dict[str, Any]:
        """Get all applications for a specific job"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            query = f'job_id=eq.{job_id}&limit={limit}&offset={offset}&order=application_date.desc'
            
            response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?{query}',
                headers=headers
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json(),
                    'count': len(response.json()),
                    'status_code': 200
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to fetch job applications',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def get_all_applications(self, status: Optional[str] = None, employer_id: Optional[str] = None,
                            limit: int = 50, offset: int = 0, auth_token: str = None) -> Dict[str, Any]:
        """Get all applications (admin view)"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            query = f'limit={limit}&offset={offset}&order=application_date.desc'
            
            if status:
                query += f'&status=eq.{status}'
            if employer_id:
                query += f'&employer_id=eq.{employer_id}'
            
            response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?{query}',
                headers=headers
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json(),
                    'count': len(response.json()),
                    'status_code': 200
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to fetch applications',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def get_application_by_id(self, application_id: str, auth_token: str = None) -> Dict[str, Any]:
        """Get a specific application"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?id=eq.{application_id}',
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                return {
                    'success': True,
                    'data': response.json()[0],
                    'status_code': 200
                }
            else:
                return {
                    'success': False,
                    'error': 'Application not found',
                    'status_code': 404
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def update_application_status(self, application_id: str, status: str, 
                                 notes: Optional[str] = None, 
                                 reviewed_by: Optional[str] = None,
                                 auth_token: str = None) -> Dict[str, Any]:
        """Update application status (admin only)"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            data = {
                'status': status,
                'reviewed_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if notes:
                data['notes'] = notes
            if reviewed_by:
                data['reviewed_by'] = reviewed_by
            
            response = requests.patch(
                f'{self.supabase_url}/rest/v1/applications?id=eq.{application_id}',
                json=data,
                headers=headers
            )
            
            if response.status_code in [200, 204]:
                return {
                    'success': True,
                    'message': f'Application status updated to {status}',
                    'status_code': response.status_code
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to update application status',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def check_if_applied(self, student_id: str, job_id: str, auth_token: str = None) -> Dict[str, Any]:
        """Check if student has already applied to a job"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            query = f'student_id=eq.{student_id}&job_id=eq.{job_id}&status=neq.withdrawn'
            
            response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?{query}',
                headers=headers
            )
            
            if response.status_code == 200:
                has_applied = len(response.json()) > 0
                return {
                    'success': True,
                    'has_applied': has_applied,
                    'application': response.json()[0] if has_applied else None,
                    'status_code': 200
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to check application status',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def get_application_stats(self, auth_token: str = None) -> Dict[str, Any]:
        """Get application statistics"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            # Get total applications
            total_response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?select=id',
                headers=headers
            )
            
            # Get pending applications
            pending_response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?status=eq.pending&select=id',
                headers=headers
            )
            
            # Get accepted applications
            accepted_response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?status=eq.accepted&select=id',
                headers=headers
            )
            
            # Get rejected applications
            rejected_response = requests.get(
                f'{self.supabase_url}/rest/v1/applications?status=eq.rejected&select=id',
                headers=headers
            )
            
            if all(resp.status_code == 200 for resp in [total_response, pending_response, accepted_response, rejected_response]):
                return {
                    'success': True,
                    'data': {
                        'total': len(total_response.json()),
                        'pending': len(pending_response.json()),
                        'accepted': len(accepted_response.json()),
                        'rejected': len(rejected_response.json())
                    },
                    'status_code': 200
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to fetch application statistics',
                    'status_code': 500
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def delete_application(self, application_id: str, auth_token: str = None) -> Dict[str, Any]:
        """Delete an application (withdraw)"""
        try:
            headers = self.headers.copy()
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            # Soft delete by setting status to withdrawn
            data = {
                'status': 'withdrawn',
                'updated_at': datetime.utcnow().isoformat()
            }
            
            response = requests.patch(
                f'{self.supabase_url}/rest/v1/applications?id=eq.{application_id}',
                json=data,
                headers=headers
            )
            
            if response.status_code in [200, 204]:
                return {
                    'success': True,
                    'message': 'Application withdrawn',
                    'status_code': response.status_code
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to withdraw application',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }

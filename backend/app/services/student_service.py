import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import requests

logger = logging.getLogger(__name__)
logger.info("Initializing student_service module")


class StudentService:
    """Service for handling student management operations"""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        logger.info(f"StudentService __init__: SUPABASE_URL={self.supabase_url}, has_key={bool(self.supabase_key)}")
        
        if self.supabase_url and self.supabase_key:
            self.api_url = f"{self.supabase_url}/rest/v1"
            self.headers = {
                "Content-Type": "application/json",
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}"
            }
        else:
            logger.error("SUPABASE_URL and/or SUPABASE_KEY environment variables not set")
            self.api_url = None
            self.headers = None

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to Supabase REST API"""
        if not self.api_url or not self.headers:
            return {
                "success": False,
                "error": "Supabase not configured",
                "status_code": 500
            }

        try:
            url = f"{self.api_url}{endpoint}"
            
            if method == "GET":
                response = requests.get(url, headers=self.headers, params=params)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=self.headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported HTTP method: {method}",
                    "status_code": 400
                }

            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "data": response.json() if response.text else None,
                    "status_code": response.status_code
                }
            elif response.status_code == 404:
                return {
                    "success": False,
                    "error": "Not found",
                    "status_code": 404
                }
            else:
                return {
                    "success": False,
                    "error": response.text or f"HTTP {response.status_code}",
                    "status_code": response.status_code
                }

        except Exception as e:
            logger.error(f"Error making request to {endpoint}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_all_students(self, search: Optional[str] = None, status: Optional[str] = None, 
                        limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get all students with optional filtering and pagination"""
        try:
            params = {
                "role": "eq.student",
                "order": "created_at.desc",
                "limit": str(limit),
                "offset": str(offset),
                "select": "*"
            }
            
            if search:
                params["or"] = f"(full_name.ilike.%{search}%,email.ilike.%{search}%)"
            
            result = self._make_request("GET", "/profiles", params=params)
            
            if result.get("success"):
                result["count"] = len(result.get("data", []))
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting all students: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_students_count(self) -> Dict[str, Any]:
        """Get total students count"""
        try:
            params = {
                "role": "eq.student",
                "select": "id"
            }
            
            result = self._make_request("GET", "/profiles", params=params)
            
            if result.get("success"):
                count = len(result.get("data", []))
                result["count"] = count
                result["data"] = {"count": count}
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting students count: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_student_by_id(self, student_id: str) -> Dict[str, Any]:
        """Get a specific student by ID"""
        try:
            params = {
                "id": f"eq.{student_id}"
            }
            
            result = self._make_request("GET", "/profiles", params=params)
            
            if result.get("success"):
                data = result.get("data", [])
                if data and len(data) > 0:
                    result["data"] = data[0]
                else:
                    result["success"] = False
                    result["error"] = "Student not found"
                    result["status_code"] = 404
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting student {student_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_student_profile(self, student_id: str) -> Dict[str, Any]:
        """Get full student profile with statistics"""
        try:
            # Get student profile
            params = {"id": f"eq.{student_id}"}
            profile_result = self._make_request("GET", "/profiles", params=params)
            
            if not profile_result.get("success") or not profile_result.get("data"):
                return {
                    "success": False,
                    "error": "Student not found",
                    "status_code": 404
                }
            
            profile = profile_result["data"][0] if isinstance(profile_result["data"], list) else profile_result["data"]
            
            # Get student resumes
            resumes_result = self._make_request("GET", "/resumes", params={"user_id": f"eq.{student_id}"})
            resumes_count = len(resumes_result.get("data", [])) if resumes_result.get("success") else 0
            
            # Get student interviews
            interviews_result = self._make_request("GET", "/interviews", params={"user_id": f"eq.{student_id}"})
            interviews_count = len(interviews_result.get("data", [])) if interviews_result.get("success") else 0
            
            profile["resumes_count"] = resumes_count
            profile["interviews_count"] = interviews_count
            
            return {
                "success": True,
                "data": profile,
                "status_code": 200
            }
        
        except Exception as e:
            logger.error(f"Error getting student profile {student_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def update_student(self, student_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update student profile"""
        try:
            endpoint = f"/profiles?id=eq.{student_id}"
            result = self._make_request("PUT", endpoint, data=data)
            
            return result
        
        except Exception as e:
            logger.error(f"Error updating student {student_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def delete_student(self, student_id: str) -> Dict[str, Any]:
        """Delete student profile"""
        try:
            endpoint = f"/profiles?id=eq.{student_id}"
            result = self._make_request("DELETE", endpoint)
            
            return result
        
        except Exception as e:
            logger.error(f"Error deleting student {student_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_students_stats(self) -> Dict[str, Any]:
        """Get student statistics overview"""
        try:
            params = {"role": "eq.student", "select": "created_at"}
            result = self._make_request("GET", "/profiles", params=params)
            
            if result.get("success"):
                data = result.get("data", [])
                total = len(data)
                
                # Count students by registration date
                today = datetime.utcnow().date()
                today_students = sum(1 for s in data if datetime.fromisoformat(s.get("created_at", "").split("T")[0]).date() == today)
                
                stats = {
                    "total_students": total,
                    "registered_today": today_students,
                    "active": total  # All students are considered active
                }
                result["data"] = stats
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting students stats: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

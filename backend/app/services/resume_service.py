import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import requests

logger = logging.getLogger(__name__)
logger.info("Initializing resume_service module")


class ResumeService:
    """Service for handling resume operations"""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        logger.info(f"ResumeService __init__: SUPABASE_URL={self.supabase_url}, has_key={bool(self.supabase_key)}")
        
        if self.supabase_url and self.supabase_key:
            # Use direct REST API endpoint for resumes table
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

    def get_user_resumes(self, user_id: str) -> Dict[str, Any]:
        """Get all resumes for a specific user"""
        try:
            params = {
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc"
            }
            
            result = self._make_request("GET", "/resumes", params=params)
            
            if result.get("success"):
                result["count"] = len(result.get("data", []))
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting resumes for user {user_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_user_resumes_count(self, user_id: str) -> Dict[str, Any]:
        """Get the count of resumes for a specific user"""
        try:
            params = {
                "user_id": f"eq.{user_id}",
                "select": "id"
            }
            
            result = self._make_request("GET", "/resumes", params=params)
            
            if result.get("success"):
                count = len(result.get("data", []))
                result["count"] = count
                result["data"] = {"count": count}
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting resume count for user {user_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_resume_by_id(self, resume_id: str) -> Dict[str, Any]:
        """Get a specific resume by ID"""
        try:
            params = {
                "id": f"eq.{resume_id}"
            }
            
            result = self._make_request("GET", "/resumes", params=params)
            
            if result.get("success"):
                data = result.get("data", [])
                if data and len(data) > 0:
                    result["data"] = data[0]
                else:
                    result["success"] = False
                    result["error"] = "Resume not found"
                    result["status_code"] = 404
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting resume {resume_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def create_resume(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new resume record"""
        try:
            # Validate required fields
            required_fields = ["user_id", "file_name", "file_path"]
            for field in required_fields:
                if field not in data:
                    return {
                        "success": False,
                        "error": f"Missing required field: {field}",
                        "status_code": 400
                    }
            
            result = self._make_request("POST", "/resumes", data=data)
            
            return result
        
        except Exception as e:
            logger.error(f"Error creating resume: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def update_resume(self, resume_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a resume record"""
        try:
            endpoint = f"/resumes?id=eq.{resume_id}"
            result = self._make_request("PUT", endpoint, data=data)
            
            return result
        
        except Exception as e:
            logger.error(f"Error updating resume {resume_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def delete_resume(self, resume_id: str) -> Dict[str, Any]:
        """Delete a resume record"""
        try:
            endpoint = f"/resumes?id=eq.{resume_id}"
            result = self._make_request("DELETE", endpoint)
            
            return result
        
        except Exception as e:
            logger.error(f"Error deleting resume {resume_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

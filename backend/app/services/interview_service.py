import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import requests

logger = logging.getLogger(__name__)
logger.info("Initializing interview_service module")


class InterviewService:
    """Service for handling interview operations (mock interviews and evaluations)"""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        logger.info(f"InterviewService __init__: SUPABASE_URL={self.supabase_url}, has_key={bool(self.supabase_key)}")
        
        if self.supabase_url and self.supabase_key:
            # Use direct REST API endpoint for interviews table
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

    def get_user_interviews(self, user_id: str, status: Optional[str] = None) -> Dict[str, Any]:
        """Get all interviews for a specific user"""
        try:
            params = {
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc"
            }
            
            if status:
                params["status"] = f"eq.{status}"
            
            result = self._make_request("GET", "/interviews", params=params)
            
            if result.get("success"):
                result["count"] = len(result.get("data", []))
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting interviews for user {user_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_user_interviews_count(self, user_id: str, status: Optional[str] = None) -> Dict[str, Any]:
        """Get the count of interviews for a specific user"""
        try:
            params = {
                "user_id": f"eq.{user_id}",
                "select": "id"
            }
            
            if status:
                params["status"] = f"eq.{status}"
            
            result = self._make_request("GET", "/interviews", params=params)
            
            if result.get("success"):
                count = len(result.get("data", []))
                result["count"] = count
                result["data"] = {"count": count}
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting interview count for user {user_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_interview_by_id(self, interview_id: str) -> Dict[str, Any]:
        """Get a specific interview by ID"""
        try:
            params = {
                "id": f"eq.{interview_id}"
            }
            
            result = self._make_request("GET", "/interviews", params=params)
            
            if result.get("success"):
                data = result.get("data", [])
                if data and len(data) > 0:
                    result["data"] = data[0]
                else:
                    result["success"] = False
                    result["error"] = "Interview not found"
                    result["status_code"] = 404
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting interview {interview_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def create_interview(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new interview record"""
        try:
            # Validate required fields
            required_fields = ["user_id", "interview_type"]
            for field in required_fields:
                if field not in data:
                    return {
                        "success": False,
                        "error": f"Missing required field: {field}",
                        "status_code": 400
                    }
            
            # Set default values
            data["status"] = data.get("status", "in_progress")
            data["created_at"] = data.get("created_at", datetime.utcnow().isoformat())
            
            result = self._make_request("POST", "/interviews", data=data)
            
            return result
        
        except Exception as e:
            logger.error(f"Error creating interview: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def update_interview(self, interview_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an interview record"""
        try:
            endpoint = f"/interviews?id=eq.{interview_id}"
            result = self._make_request("PUT", endpoint, data=data)
            
            return result
        
        except Exception as e:
            logger.error(f"Error updating interview {interview_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def delete_interview(self, interview_id: str) -> Dict[str, Any]:
        """Delete an interview record"""
        try:
            endpoint = f"/interviews?id=eq.{interview_id}"
            result = self._make_request("DELETE", endpoint)
            
            return result
        
        except Exception as e:
            logger.error(f"Error deleting interview {interview_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

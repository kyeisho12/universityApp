import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import requests

logger = logging.getLogger(__name__)
logger.info("Initializing job_service module")


class JobService:
    """Service for handling job posting operations"""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        logger.info(f"JobService __init__: SUPABASE_URL={self.supabase_url}, has_key={bool(self.supabase_key)}")
        
        if self.supabase_url and self.supabase_key:
            # Use direct REST API endpoint for jobs table
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

    def get_all_jobs(self, status: Optional[str] = "active", category: Optional[str] = None, 
                     job_type: Optional[str] = None, location: Optional[str] = None) -> Dict[str, Any]:
        """Get all jobs with optional filtering"""
        try:
            # Build query parameters
            params = {}
            
            if status:
                params["status"] = f"eq.{status}"
            
            if category:
                params["category"] = f"eq.{category}"
            
            if job_type:
                params["job_type"] = f"eq.{job_type}"
            
            if location:
                params["location"] = f"ilike.%{location}%"
            
            # Add select with employer info and order by deadline
            params["select"] = "*,employer:employer_id(id,name,website)"
            params["order"] = "deadline.asc"
            
            result = self._make_request("GET", "/jobs", params=params)
            
            if result.get("success"):
                # Transform data to flatten employer info if needed
                jobs = result.get("data", [])
                if jobs and isinstance(jobs, list) and len(jobs) > 0:
                    # Data is already in correct format from Supabase
                    pass
                
                result["count"] = len(jobs) if isinstance(jobs, list) else 0
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting all jobs: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_jobs_by_employer(self, employer_id: str, status: Optional[str] = "active") -> Dict[str, Any]:
        """Get jobs posted by a specific employer"""
        try:
            params = {
                "employer_id": f"eq.{employer_id}",
                "order": "created_at.desc"
            }
            
            if status:
                params["status"] = f"eq.{status}"
            
            result = self._make_request("GET", "/jobs", params=params)
            
            if result.get("success"):
                result["count"] = len(result.get("data", []))
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting jobs by employer {employer_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_job_by_id(self, job_id: str) -> Dict[str, Any]:
        """Get a specific job by ID"""
        try:
            params = {
                "id": f"eq.{job_id}",
                "select": "*,employer:employer_id(id,name,website)"
            }
            
            result = self._make_request("GET", "/jobs", params=params)
            
            if result.get("success"):
                data = result.get("data", [])
                if data and len(data) > 0:
                    result["data"] = data[0]
                else:
                    result["success"] = False
                    result["error"] = "Job not found"
                    result["status_code"] = 404
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting job {job_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def create_job(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new job posting"""
        try:
            # Validate required fields
            required_fields = ["employer_id", "title", "category", "job_type", "location", "deadline"]
            for field in required_fields:
                if field not in data:
                    return {
                        "success": False,
                        "error": f"Missing required field: {field}",
                        "status_code": 400
                    }
            
            # Set default values
            data["status"] = data.get("status", "active")
            data["applications_count"] = data.get("applications_count", 0)
            
            result = self._make_request("POST", "/jobs", data=data)
            
            return result
        
        except Exception as e:
            logger.error(f"Error creating job: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def update_job(self, job_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a job posting"""
        try:
            # Use id filter for update
            endpoint = f"/jobs?id=eq.{job_id}"
            result = self._make_request("PUT", endpoint, data=data)
            
            return result
        
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def delete_job(self, job_id: str) -> Dict[str, Any]:
        """Delete a job posting"""
        try:
            endpoint = f"/jobs?id=eq.{job_id}"
            result = self._make_request("DELETE", endpoint)
            
            return result
        
        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def search_jobs(self, keyword: str) -> Dict[str, Any]:
        """Search jobs by keyword in title, description, or requirements"""
        try:
            # Using full-text search or simple LIKE filtering
            params = {
                "or": f"(title.ilike.%{keyword}%,description.ilike.%{keyword}%)",
                "status": "eq.active",
                "order": "created_at.desc"
            }
            
            result = self._make_request("GET", "/jobs", params=params)
            
            if result.get("success"):
                result["count"] = len(result.get("data", []))
            
            return result
        
        except Exception as e:
            logger.error(f"Error searching jobs with keyword '{keyword}': {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

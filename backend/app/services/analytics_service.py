import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
import requests

logger = logging.getLogger(__name__)
logger.info("Initializing analytics_service module")


class AnalyticsService:
    """Service for handling analytics and reporting operations"""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        logger.info(f"AnalyticsService __init__: SUPABASE_URL={self.supabase_url}, has_key={bool(self.supabase_key)}")
        
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

    def get_employers_count(self) -> Dict[str, Any]:
        """Get total employers count"""
        try:
            params = {"select": "id"}
            
            result = self._make_request("GET", "/employers", params=params)
            
            if result.get("success"):
                count = len(result.get("data", []))
                result["count"] = count
                result["data"] = {"count": count}
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting employers count: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_interviews_count(self, status: str = "completed") -> Dict[str, Any]:
        """Get interviews count by status"""
        try:
            params = {
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
            logger.error(f"Error getting interviews count: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_events_count(self) -> Dict[str, Any]:
        """Get active events count"""
        try:
            params = {
                "select": "id",
                "gte": f"end_date.gte.{datetime.utcnow().isoformat()}"
            }
            
            result = self._make_request("GET", "/career_events", params=params)
            
            if result.get("success"):
                count = len(result.get("data", []))
                result["count"] = count
                result["data"] = {"count": count}
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting events count: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_user_stats(self) -> Dict[str, Any]:
        """Get user statistics by role"""
        try:
            params = {"select": "role"}
            
            result = self._make_request("GET", "/profiles", params=params)
            
            if result.get("success"):
                data = result.get("data", [])
                stats = {
                    "students": sum(1 for u in data if u.get("role") == "student"),
                    "admins": sum(1 for u in data if u.get("role") == "admin"),
                    "employers": sum(1 for u in data if u.get("role") == "employer"),
                    "total": len(data)
                }
                result["data"] = stats
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_job_stats(self) -> Dict[str, Any]:
        """Get job statistics"""
        try:
            params = {"select": "status"}
            
            result = self._make_request("GET", "/jobs", params=params)
            
            if result.get("success"):
                data = result.get("data", [])
                stats = {
                    "active": sum(1 for j in data if j.get("status") == "active"),
                    "closed": sum(1 for j in data if j.get("status") == "closed"),
                    "archived": sum(1 for j in data if j.get("status") == "archived"),
                    "total": len(data)
                }
                result["data"] = stats
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting job stats: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_applications_count(self) -> Dict[str, Any]:
        """Get total job applications count"""
        try:
            params = {"select": "id"}
            
            # If you have an applications table, use it. Otherwise, sum from jobs
            result = self._make_request("GET", "/jobs", params={"select": "applications_count"})
            
            if result.get("success"):
                data = result.get("data", [])
                count = sum(j.get("applications_count", 0) for j in data)
                result["count"] = count
                result["data"] = {"count": count}
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting applications count: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_recent_activity(self, limit: int = 10) -> Dict[str, Any]:
        """Get recent activity feed combining various events"""
        try:
            activities = []
            
            # Recent interviews
            interviews_result = self._make_request("GET", "/interviews", params={
                "select": "user_id,created_at",
                "order": "created_at.desc",
                "limit": str(limit // 3)
            })
            
            if interviews_result.get("success"):
                for interview in interviews_result.get("data", []):
                    activities.append({
                        "type": "interview",
                        "text": f"Student {interview.get('user_id', 'Unknown')} completed mock interview",
                        "timestamp": interview.get("created_at"),
                        "time_ago": self._get_time_ago(interview.get("created_at"))
                    })
            
            # Recent student registrations
            profiles_result = self._make_request("GET", "/profiles", params={
                "select": "full_name,created_at",
                "eq": "role.eq.student",
                "order": "created_at.desc",
                "limit": str(limit // 3)
            })
            
            if profiles_result.get("success"):
                for profile in profiles_result.get("data", []):
                    activities.append({
                        "type": "registration",
                        "text": f"New student registration: {profile.get('full_name', 'Unknown')}",
                        "timestamp": profile.get("created_at"),
                        "time_ago": self._get_time_ago(profile.get("created_at"))
                    })
            
            # Recent job postings
            jobs_result = self._make_request("GET", "/jobs", params={
                "select": "title,employer_id,created_at",
                "order": "created_at.desc",
                "limit": str(limit // 3)
            })
            
            if jobs_result.get("success"):
                for job in jobs_result.get("data", []):
                    activities.append({
                        "type": "job",
                        "text": f"New job posted: {job.get('title', 'Unknown')}",
                        "timestamp": job.get("created_at"),
                        "time_ago": self._get_time_ago(job.get("created_at"))
                    })
            
            # Sort by timestamp and limit
            activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            activities = activities[:limit]
            
            return {
                "success": True,
                "data": activities,
                "status_code": 200
            }
        
        except Exception as e:
            logger.error(f"Error getting recent activity: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Get all dashboard metrics"""
        try:
            metrics = {}
            
            # Get all counts
            students = self.get_students_count()
            employers = self.get_employers_count()
            interviews = self.get_interviews_count()
            events = self.get_events_count()
            
            metrics["total_students"] = students.get("data", {}).get("count", 0) if students.get("success") else 0
            metrics["total_employers"] = employers.get("data", {}).get("count", 0) if employers.get("success") else 0
            metrics["total_interviews"] = interviews.get("data", {}).get("count", 0) if interviews.get("success") else 0
            metrics["active_events"] = events.get("data", {}).get("count", 0) if events.get("success") else 0
            
            return {
                "success": True,
                "data": metrics,
                "status_code": 200
            }
        
        except Exception as e:
            logger.error(f"Error getting dashboard metrics: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    @staticmethod
    def _get_time_ago(timestamp: str) -> str:
        """Convert timestamp to human-readable time ago string"""
        try:
            if not timestamp:
                return "Unknown"
            
            dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            now = datetime.utcnow().replace(tzinfo=dt.tzinfo) if dt.tzinfo else datetime.utcnow()
            diff = now - dt
            
            seconds = diff.total_seconds()
            if seconds < 60:
                return "Just now"
            elif seconds < 3600:
                minutes = int(seconds / 60)
                return f"{minutes}m ago"
            elif seconds < 86400:
                hours = int(seconds / 3600)
                return f"{hours}h ago"
            else:
                days = int(seconds / 86400)
                return f"{days}d ago"
        except:
            return "Recently"

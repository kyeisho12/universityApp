import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import requests

logger = logging.getLogger(__name__)


class EmployerService:
    """Service for handling employer/partner operations"""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }

    def create_employer(self, employer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new employer in the database
        
        Args:
            employer_data: Dictionary containing employer information
                - name (required): Company name
                - website: Website URL
                - industry (required): Industry type
                - contact_email (required): Contact email
                - phone (optional): Phone number
                - address (optional): Physical address
                - description (optional): Company description
                - logo_url (optional): Logo URL
        
        Returns:
            Created employer data or error response
        """
        try:
            # Validate required fields
            required_fields = ["name", "industry", "contact_email"]
            for field in required_fields:
                if not employer_data.get(field):
                    return {
                        "success": False,
                        "error": f"Missing required field: {field}",
                        "status_code": 400
                    }

            # Prepare data for insertion
            data = {
                "name": employer_data.get("name").strip(),
                "website": employer_data.get("website", "").strip(),
                "industry": employer_data.get("industry").strip(),
                "contact_email": employer_data.get("contact_email").strip(),
                "phone": employer_data.get("phone", "").strip() or None,
                "address": employer_data.get("address", "").strip() or None,
                "description": employer_data.get("description", "").strip() or None,
                "logo_url": employer_data.get("logo_url", "").strip() or None,
                "verified": False,  # New employers start as unverified
                "job_listings_count": 0,
            }

            # Insert into Supabase using REST API
            endpoint = f"{self.url}/rest/v1/employers"
            response = requests.post(endpoint, json=data, headers=self.headers)
            response.raise_for_status()
            
            result_data = response.json()
            if isinstance(result_data, list) and result_data:
                return {
                    "success": True,
                    "data": result_data[0],
                    "status_code": 201
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to create employer",
                    "status_code": 500
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def get_all_employers(self, include_unverified: bool = False) -> Dict[str, Any]:
        """
        Get all employers
        
        Returns:
            List of all employers
        """
        try:
            # Use Supabase REST API directly
            endpoint = f"{self.url}/rest/v1/employers?select=*"
            response = requests.get(endpoint, headers=self.headers)
            response.raise_for_status()
            
            data = response.json() if response.text else []
            print(f"[DEBUG] Fetched {len(data)} employers from Supabase")
            logger.info(f"[DEBUG] Fetched {len(data)} employers from Supabase")
            
            return {
                "success": True,
                "data": data,
                "count": len(data),
                "status_code": 200
            }

        except Exception as e:
            error_msg = str(e)
            print(f"[DEBUG] Error fetching employers: {error_msg}")
            logger.error(f"[DEBUG] Error fetching employers: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "status_code": 500
            }

    def get_employer_by_id(self, employer_id: str) -> Dict[str, Any]:
        """
        Get a specific employer by ID
        
        Args:
            employer_id: UUID of the employer
        
        Returns:
            Employer data or error response
        """
        try:
            endpoint = f"{self.url}/rest/v1/employers?id=eq.{employer_id}&select=*"
            response = requests.get(endpoint, headers=self.headers)
            response.raise_for_status()
            
            data = response.json() if response.text else []
            if data:
                return {
                    "success": True,
                    "data": data[0],
                    "status_code": 200
                }
            else:
                return {
                    "success": False,
                    "error": "Employer not found",
                    "status_code": 404
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def update_employer(self, employer_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing employer
        
        Args:
            employer_id: UUID of the employer
            update_data: Dictionary containing fields to update
        
        Returns:
            Updated employer data or error response
        """
        try:
            # Only allow specific fields to be updated
            allowed_fields = ["name", "website", "industry", "contact_email", "phone", 
                            "address", "description", "logo_url", "verified", "job_listings_count"]
            
            data = {k: v for k, v in update_data.items() if k in allowed_fields}
            
            if not data:
                return {
                    "success": False,
                    "error": "No valid fields to update",
                    "status_code": 400
                }

            endpoint = f"{self.url}/rest/v1/employers?id=eq.{employer_id}"
            response = requests.patch(endpoint, json=data, headers=self.headers)
            response.raise_for_status()
            
            result_data = response.json()
            if isinstance(result_data, list) and result_data:
                return {
                    "success": True,
                    "data": result_data[0],
                    "status_code": 200
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to update employer",
                    "status_code": 500
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def delete_employer(self, employer_id: str) -> Dict[str, Any]:
        """
        Delete an employer
        
        Args:
            employer_id: UUID of the employer
        
        Returns:
            Success status or error response
        """
        try:
            endpoint = f"{self.url}/rest/v1/employers?id=eq.{employer_id}"
            response = requests.delete(endpoint, headers=self.headers)
            response.raise_for_status()
            
            return {
                "success": True,
                "message": "Employer deleted successfully",
                "status_code": 200
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def search_employers(self, query: str, include_unverified: bool = False) -> Dict[str, Any]:
        """
        Search employers by name or industry
        
        Args:
            query: Search query string
            include_unverified: Include unverified employers in results
        
        Returns:
            List of matching employers or error response
        """
        try:
            # Get all employers first
            endpoint = f"{self.url}/rest/v1/employers?select=*"
            response = requests.get(endpoint, headers=self.headers)
            response.raise_for_status()
            
            employers = response.json() if response.text else []
            
            if not include_unverified:
                employers = [e for e in employers if e.get("verified")]
            
            # Filter by search query (name or industry)
            query_lower = query.lower()
            filtered = [
                e for e in employers 
                if query_lower in e.get("name", "").lower() or 
                   query_lower in e.get("industry", "").lower()
            ]
            
            return {
                "success": True,
                "data": filtered,
                "count": len(filtered),
                "status_code": 200
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

    def verify_employer(self, employer_id: str) -> Dict[str, Any]:
        """
        Mark an employer as verified (admin only)
        
        Args:
            employer_id: UUID of the employer
        
        Returns:
            Updated employer data or error response
        """
        return self.update_employer(employer_id, {"verified": True})

    def get_stats(self) -> Dict[str, Any]:
        """
        Get employer statistics
        
        Returns:
            Statistics about employers
        """
        try:
            endpoint = f"{self.url}/rest/v1/employers?select=*"
            response = requests.get(endpoint, headers=self.headers)
            response.raise_for_status()
            
            employers = response.json() if response.text else []
            
            stats = {
                "total_partners": len(employers),
                "verified": len([e for e in employers if e.get("verified")]),
                "pending": len([e for e in employers if not e.get("verified")]),
                "active_listings": sum(e.get("job_listings_count", 0) for e in employers),
            }
            
            return {
                "success": True,
                "data": stats,
                "status_code": 200
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 500
            }

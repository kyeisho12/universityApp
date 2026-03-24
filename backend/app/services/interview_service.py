import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import requests
from app.ai_module.whisper.transcriber import WhisperTranscriber
from app.ai_module.phi3 import Phi3FollowupGenerator

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
        self.whisper_transcriber = WhisperTranscriber()
        self.phi3_followup_generator = Phi3FollowupGenerator()

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
            elif method == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data)
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

    @staticmethod
    def _normalize_question_text(text: Optional[str]) -> str:
        """Normalize question text for stable dedupe lookup."""
        return " ".join((text or "").strip().lower().split())

    def _find_question_bank_id_by_text(self, question_text: Optional[str]) -> Optional[str]:
        """Find existing question bank id by normalized question text."""
        normalized_question = self._normalize_question_text(question_text)
        if not normalized_question:
            return None

        result = self._make_request(
            "GET",
            "/interview_question_bank",
            params={
                "select": "id",
                "question_normalized": f"eq.{normalized_question}",
                "limit": "1",
            },
        )
        if not result.get("success"):
            return None

        records = result.get("data") or []
        if not records:
            return None

        return records[0].get("id")

    def _persist_generated_followup_question(
        self,
        *,
        followup_question: str,
        category: Optional[str],
        parent_question_text: Optional[str],
        source_model: Optional[str],
        generation_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Persist generated follow-up question into interview_question_bank with dedupe."""
        normalized_followup = self._normalize_question_text(followup_question)
        if not normalized_followup:
            return {
                "success": False,
                "error": "Generated follow-up question is empty",
            }

        existing_id = self._find_question_bank_id_by_text(normalized_followup)
        if existing_id:
            return {
                "success": True,
                "question_bank_id": existing_id,
                "deduped": True,
            }

        parent_question_id = self._find_question_bank_id_by_text(parent_question_text)

        payload = {
            "question_text": followup_question.strip(),
            "category": (category or "general").strip() or "general",
            "source_type": "generated",
            "source_model": (source_model or "phi-3-mini").strip() or "phi-3-mini",
            "language_code": "en",
            "parent_question_id": parent_question_id,
            "generation_context": generation_context or {},
            "is_active": True,
        }

        insert_result = self._make_request(
            "POST",
            "/interview_question_bank?select=id,question_text,category,source_type,source_model,parent_question_id,created_at,updated_at",
            data=payload,
        )

        if insert_result.get("success"):
            created_records = insert_result.get("data") or []
            created_id = created_records[0].get("id") if created_records else None
            if created_id:
                return {
                    "success": True,
                    "question_bank_id": created_id,
                    "deduped": False,
                }

        fallback_id = self._find_question_bank_id_by_text(normalized_followup)
        if fallback_id:
            return {
                "success": True,
                "question_bank_id": fallback_id,
                "deduped": True,
            }

        return {
            "success": False,
            "error": insert_result.get("error", "Failed to persist generated follow-up question"),
            "status_code": insert_result.get("status_code", 500),
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

    def start_session(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new interview session (parent session for multiple recording segments)."""
        try:
            user_id = data.get("user_id")
            if not user_id:
                return {
                    "success": False,
                    "error": "Missing required field: user_id",
                    "status_code": 400,
                }

            session_payload = {
                "user_id": user_id,
                "status": "in_progress",
                "total_questions": int(data.get("total_questions", 5)),
                "current_question_index": int(data.get("current_question_index", 0)),
                "storage_prefix": data.get("storage_prefix") or f"{user_id}/{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                "started_at": datetime.utcnow().isoformat(),
                "metadata": data.get("metadata", {}),
            }

            return self._make_request("POST", "/interview_sessions?select=*", data=session_payload)
        except Exception as e:
            logger.error(f"Error starting interview session: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def get_session_by_id(self, session_id: str) -> Dict[str, Any]:
        """Get interview session details by ID."""
        try:
            params = {"id": f"eq.{session_id}", "select": "*"}
            result = self._make_request("GET", "/interview_sessions", params=params)

            if result.get("success"):
                data = result.get("data", [])
                if data and len(data) > 0:
                    result["data"] = data[0]
                else:
                    result["success"] = False
                    result["error"] = "Session not found"
                    result["status_code"] = 404
            return result
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def pause_session(self, session_id: str) -> Dict[str, Any]:
        """Pause an interview session."""
        try:
            payload = {
                "status": "paused",
                "paused_at": datetime.utcnow().isoformat(),
            }
            endpoint = f"/interview_sessions?id=eq.{session_id}&select=*"
            return self._make_request("PUT", endpoint, data=payload)
        except Exception as e:
            logger.error(f"Error pausing session {session_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def resume_session(self, session_id: str) -> Dict[str, Any]:
        """Resume an interview session."""
        try:
            payload = {
                "status": "in_progress",
                "resumed_at": datetime.utcnow().isoformat(),
            }
            endpoint = f"/interview_sessions?id=eq.{session_id}&select=*"
            return self._make_request("PUT", endpoint, data=payload)
        except Exception as e:
            logger.error(f"Error resuming session {session_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def end_session(self, session_id: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """End an interview session."""
        try:
            payload: Dict[str, Any] = {
                "status": "completed",
                "ended_at": datetime.utcnow().isoformat(),
            }
            if data and isinstance(data.get("metadata"), dict):
                payload["metadata"] = data.get("metadata")

            endpoint = f"/interview_sessions?id=eq.{session_id}&select=*"
            return self._make_request("PUT", endpoint, data=payload)
        except Exception as e:
            logger.error(f"Error ending session {session_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def update_session_progress(self, session_id: str, current_question_index: int) -> Dict[str, Any]:
        """Update current question index for an interview session."""
        try:
            payload = {
                "current_question_index": max(0, int(current_question_index)),
            }
            endpoint = f"/interview_sessions?id=eq.{session_id}&select=*"
            return self._make_request("PUT", endpoint, data=payload)
        except Exception as e:
            logger.error(f"Error updating progress for session {session_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def add_recording_segment(self, session_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert one recording segment row linked to a parent interview session."""
        try:
            required_fields = ["question_index", "segment_order", "storage_path"]
            for field in required_fields:
                if field not in data:
                    return {
                        "success": False,
                        "error": f"Missing required field: {field}",
                        "status_code": 400,
                    }

            payload: Dict[str, Any] = {
                "session_id": session_id,
                "question_id": data.get("question_id"),
                "question_index": int(data.get("question_index", 0)),
                "segment_order": int(data.get("segment_order", 1)),
                "status": data.get("status", "uploaded"),
                "storage_path": data.get("storage_path"),
                "mime_type": data.get("mime_type", "video/webm"),
                "duration_seconds": data.get("duration_seconds"),
                "file_size_bytes": data.get("file_size_bytes"),
                "metadata": data.get("metadata", {}),
            }

            if "transcript_text" in data:
                payload["transcript_text"] = data.get("transcript_text")
            if "whisper_status" in data:
                payload["whisper_status"] = data.get("whisper_status")

            return self._make_request("POST", "/interview_recording_segments?select=*", data=payload)
        except Exception as e:
            logger.error(f"Error adding segment for session {session_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def get_session_segments(self, session_id: str) -> Dict[str, Any]:
        """Get recording segments for a session in question/segment order."""
        try:
            params = {
                "session_id": f"eq.{session_id}",
                "order": "question_index.asc,segment_order.asc",
            }
            result = self._make_request("GET", "/interview_recording_segments", params=params)
            if result.get("success"):
                result["count"] = len(result.get("data", []))
            return result
        except Exception as e:
            logger.error(f"Error getting segments for session {session_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def get_segment_by_id(self, segment_id: str) -> Dict[str, Any]:
        """Get one recording segment row by ID."""
        try:
            params = {
                "id": f"eq.{segment_id}",
                "select": "*",
            }
            result = self._make_request("GET", "/interview_recording_segments", params=params)
            if result.get("success"):
                data = result.get("data", [])
                if data and len(data) > 0:
                    result["data"] = data[0]
                else:
                    result["success"] = False
                    result["error"] = "Segment not found"
                    result["status_code"] = 404
            return result
        except Exception as e:
            logger.error(f"Error getting segment {segment_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status_code": 500,
            }

    def _download_storage_object_bytes(self, storage_path: str, bucket_name: str = "interview-recordings") -> Dict[str, Any]:
        """Download object bytes from Supabase Storage using service key."""
        if not self.supabase_url or not self.supabase_key:
            return {
                "success": False,
                "error": "Supabase credentials missing",
                "status_code": 500,
            }

        normalized_storage_path = (storage_path or "").strip().lstrip("/")
        bucket_prefix = f"{bucket_name}/"
        if normalized_storage_path.startswith(bucket_prefix):
            normalized_storage_path = normalized_storage_path[len(bucket_prefix):]

        if not normalized_storage_path:
            return {
                "success": False,
                "error": "Segment storage_path is empty",
                "status_code": 400,
            }

        object_url = f"{self.supabase_url}/storage/v1/object/{bucket_name}/{normalized_storage_path}"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
        }
        try:
            response = requests.get(object_url, headers=headers, timeout=120)
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": response.text or "Failed to download storage object",
                    "status_code": response.status_code,
                }
            return {
                "success": True,
                "bytes": response.content,
                "status_code": 200,
            }
        except Exception as error:
            return {
                "success": False,
                "error": str(error),
                "status_code": 500,
            }

    def _update_segment_transcription(self, segment_id: str, transcript_text: str, whisper_status: str = "completed") -> Dict[str, Any]:
        """Persist transcript on segment row."""
        payload = {
            "transcript_text": transcript_text,
            "whisper_status": whisper_status,
            "status": "transcribed" if whisper_status == "completed" else "failed",
        }
        endpoint = f"/interview_recording_segments?id=eq.{segment_id}&select=*"
        return self._make_request("PATCH", endpoint, data=payload)

    def _insert_segment_transcript_record(self, segment: Dict[str, Any], transcript_text: str, status: str = "completed", error_message: Optional[str] = None) -> Dict[str, Any]:
        """Insert normalized transcript row for future evaluation pipeline."""
        payload: Dict[str, Any] = {
            "session_id": segment.get("session_id"),
            "segment_id": segment.get("id"),
            "question_id": segment.get("question_id"),
            "question_index": segment.get("question_index"),
            "transcript_text": transcript_text,
            "language_code": "en",
            "source_model": os.getenv("OPENAI_WHISPER_MODEL", "whisper-1"),
            "status": status,
        }
        if error_message:
            payload["error_message"] = error_message

        insert_result = self._make_request("POST", "/interview_segment_transcripts?select=*", data=payload)

        if insert_result.get("success"):
            return insert_result

        if insert_result.get("status_code") == 409 and segment.get("id"):
            segment_id = segment.get("id")
            update_payload = {
                "transcript_text": transcript_text,
                "status": status,
                "source_model": payload.get("source_model"),
                "language_code": payload.get("language_code", "en"),
                "error_message": error_message,
            }
            return self._make_request(
                "PATCH",
                f"/interview_segment_transcripts?segment_id=eq.{segment_id}&select=*",
                data=update_payload,
            )

        return insert_result

    def transcribe_segment(self, segment_id: str, force: bool = False) -> Dict[str, Any]:
        """Run Whisper transcription for one recording segment and persist output."""
        try:
            segment_result = self.get_segment_by_id(segment_id)
            if not segment_result.get("success"):
                return segment_result

            segment = segment_result.get("data") or {}
            existing_text = segment.get("transcript_text")
            existing_status = segment.get("whisper_status")

            if existing_text and existing_status == "completed" and not force:
                return {
                    "success": True,
                    "data": {
                        "segment_id": segment_id,
                        "transcript_text": existing_text,
                        "status": "already_transcribed",
                    },
                    "status_code": 200,
                }

            storage_path = segment.get("storage_path")
            if not storage_path:
                return {
                    "success": False,
                    "error": "Segment has no storage_path",
                    "status_code": 400,
                }

            self._make_request(
                "PATCH",
                f"/interview_recording_segments?id=eq.{segment_id}",
                data={"whisper_status": "in_progress", "status": "transcribing"},
            )

            download_result = self._download_storage_object_bytes(storage_path)
            if not download_result.get("success"):
                error_message = download_result.get("error", "Failed to download storage object")
                self._update_segment_transcription(segment_id, "", whisper_status="failed")
                self._insert_segment_transcript_record(segment, "", status="failed", error_message=error_message)
                return {
                    "success": False,
                    "error": error_message,
                    "status_code": download_result.get("status_code", 500),
                }

            if not self.whisper_transcriber.is_configured():
                error_message = "OPENAI_API_KEY is not configured"
                self._update_segment_transcription(segment_id, "", whisper_status="failed")
                self._insert_segment_transcript_record(segment, "", status="failed", error_message=error_message)
                return {
                    "success": False,
                    "error": error_message,
                    "status_code": 503,
                }

            audio_bytes = download_result.get("bytes", b"")
            transcribe_result = self.whisper_transcriber.transcribe_audio_bytes(
                audio_bytes=audio_bytes,
                filename=os.path.basename(storage_path) or "segment.webm",
                mime_type=segment.get("mime_type") or "video/webm",
                language="en",
            )

            if not transcribe_result.get("success"):
                error_message = transcribe_result.get("error", "Whisper transcription failed")
                self._update_segment_transcription(segment_id, "", whisper_status="failed")
                self._insert_segment_transcript_record(segment, "", status="failed", error_message=error_message)
                return {
                    "success": False,
                    "error": error_message,
                    "status_code": transcribe_result.get("status_code", 500),
                }

            transcript_text = transcribe_result.get("transcript_text", "")
            self._update_segment_transcription(segment_id, transcript_text, whisper_status="completed")
            self._insert_segment_transcript_record(segment, transcript_text, status="completed")

            return {
                "success": True,
                "data": {
                    "segment_id": segment_id,
                    "transcript_text": transcript_text,
                    "status": "completed",
                },
                "status_code": 200,
            }
        except Exception as error:
            logger.error(f"Error transcribing segment {segment_id}: {str(error)}")
            return {
                "success": False,
                "error": str(error),
                "status_code": 500,
            }

    def generate_followup_question(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate one interview follow-up question using local Phi-3."""
        try:
            original_question = (data.get("original_question") or "").strip()
            candidate_answer = (data.get("candidate_answer") or "").strip()
            category = (data.get("category") or "").strip() or None
            ideal_answer = (data.get("ideal_answer") or "").strip() or None

            if not original_question:
                return {
                    "success": False,
                    "error": "Missing required field: original_question",
                    "status_code": 400,
                }

            if not candidate_answer:
                return {
                    "success": False,
                    "error": "Missing required field: candidate_answer",
                    "status_code": 400,
                }

            generation_result = self.phi3_followup_generator.generate_followup_question(
                original_question=original_question,
                candidate_answer=candidate_answer,
                category=category,
                ideal_answer=ideal_answer,
            )

            logger.info(
                "followup_generation source=%s success=%s warning=%s",
                generation_result.get("source", "unknown"),
                generation_result.get("success", False),
                generation_result.get("error") or "",
            )

            if not generation_result.get("success"):
                return {
                    "success": False,
                    "error": generation_result.get("error", "Failed to generate follow-up question"),
                    "status_code": 500,
                }

            followup_question_text = generation_result.get("question", "")
            persist_result = self._persist_generated_followup_question(
                followup_question=followup_question_text,
                category=category,
                parent_question_text=original_question,
                source_model=generation_result.get("source") or "phi-3-mini",
                generation_context={
                    "flow": "generate_followup_question",
                    "original_question": original_question,
                    "candidate_answer_present": bool(candidate_answer),
                },
            )

            persistence_warning = None
            question_bank_id = None
            if persist_result.get("success"):
                question_bank_id = persist_result.get("question_bank_id")
            else:
                persistence_warning = persist_result.get("error")
                logger.warning(
                    "Generated follow-up persisted failed: %s",
                    persistence_warning,
                )

            return {
                "success": True,
                "data": {
                    "followup_question": followup_question_text,
                    "source": generation_result.get("source", "unknown"),
                    "question_bank_id": question_bank_id,
                    "question_bank_persistence_warning": persistence_warning,
                    "warning": generation_result.get("error"),
                },
                "status_code": 200,
            }
        except Exception as error:
            logger.error(f"Error generating follow-up question: {str(error)}")
            return {
                "success": False,
                "error": str(error),
                "status_code": 500,
            }

    def decide_next_question(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Decide whether to ask a follow-up or move to the next bank question."""
        try:
            current_question = (data.get("current_question") or "").strip()
            candidate_answer = (data.get("candidate_answer") or "").strip()
            category = (data.get("category") or "").strip() or None
            ideal_answer = (data.get("ideal_answer") or "").strip() or None
            remaining_bank_questions = int(data.get("remaining_bank_questions") or 0)
            followup_count_for_current = int(data.get("followup_count_for_current") or 0)
            evaluation_source = (data.get("evaluation_source") or "").strip() or None
            raw_pool = data.get("bank_question_pool")
            bank_question_pool = (
                [{"id": str(q.get("id") or ""), "question": str(q.get("question") or "")} for q in raw_pool if isinstance(q, dict)]
                if isinstance(raw_pool, list)
                else None
            )

            if not current_question:
                return {
                    "success": False,
                    "error": "Missing required field: current_question",
                    "status_code": 400,
                }

            if not candidate_answer:
                return {
                    "success": False,
                    "error": "Missing required field: candidate_answer",
                    "status_code": 400,
                }

            decision_result = self.phi3_followup_generator.decide_next_step(
                current_question=current_question,
                candidate_answer=candidate_answer,
                remaining_bank_questions=remaining_bank_questions,
                followup_count_for_current=followup_count_for_current,
                bank_question_pool=bank_question_pool,
            )

            # If the frontend evaluation already flagged this answer as a quality gate
            # failure (zsl_star_fallback), override Phi3's decision to ensure a
            # follow-up is asked — Phi3 tends to skip follow-ups on dismissive answers.
            if (
                evaluation_source == "zsl_star_fallback"
                and followup_count_for_current < 1
                and decision_result.get("success")
                and decision_result.get("action") == "next_bank_question"
            ):
                decision_result["action"] = "follow_up"
                decision_result["reason"] = "zsl_fallback_override"
                logger.info("next_question_decision overridden to follow_up due to zsl_star_fallback evaluation")

            logger.info(
                "next_question_decision action=%s source=%s reason=%s",
                decision_result.get("action", "unknown"),
                decision_result.get("source", "unknown"),
                decision_result.get("reason", ""),
            )

            if not decision_result.get("success"):
                return {
                    "success": False,
                    "error": decision_result.get("error", "Failed to decide next question step"),
                    "status_code": 500,
                }

            action = decision_result.get("action", "next_bank_question")
            response_data: Dict[str, Any] = {
                "action": action,
                "reason": decision_result.get("reason"),
                "source": decision_result.get("source", "unknown"),
            }
            if action == "next_bank_question" and decision_result.get("selected_question_id"):
                response_data["selected_question_id"] = decision_result["selected_question_id"]

            if action == "follow_up":
                followup_result = self.phi3_followup_generator.generate_followup_question(
                    original_question=current_question,
                    candidate_answer=candidate_answer,
                    category=category,
                    ideal_answer=ideal_answer,
                )

                logger.info(
                    "decision_followup_generation source=%s warning=%s",
                    followup_result.get("source", "unknown"),
                    followup_result.get("error") or "",
                )

                followup_question_text = followup_result.get("question", "")
                persist_result = self._persist_generated_followup_question(
                    followup_question=followup_question_text,
                    category=category,
                    parent_question_text=current_question,
                    source_model=followup_result.get("source") or "phi-3-mini",
                    generation_context={
                        "flow": "decide_next_question",
                        "decision_reason": decision_result.get("reason"),
                        "remaining_bank_questions": remaining_bank_questions,
                        "followup_count_for_current": followup_count_for_current,
                    },
                )

                response_data["followup_question"] = followup_question_text
                response_data["followup_source"] = followup_result.get("source", "unknown")
                response_data["warning"] = followup_result.get("error")
                response_data["question_bank_id"] = persist_result.get("question_bank_id") if persist_result.get("success") else None
                if not persist_result.get("success"):
                    persistence_warning = persist_result.get("error")
                    response_data["question_bank_persistence_warning"] = persistence_warning
                    logger.warning("Failed to persist follow-up question from decision flow: %s", persistence_warning)

            return {
                "success": True,
                "data": response_data,
                "status_code": 200,
            }
        except Exception as error:
            logger.error(f"Error deciding next question: {str(error)}")
            return {
                "success": False,
                "error": str(error),
                "status_code": 500,
            }

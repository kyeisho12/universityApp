import os
import tempfile
import requests
from typing import Dict, Any, Optional


class WhisperTranscriber:
	"""Hybrid Whisper transcriber: local faster-whisper and/or OpenAI API fallback."""

	def __init__(self):
		self.backend = os.getenv("WHISPER_BACKEND", "hybrid").lower()
		self.hybrid_preference = os.getenv("WHISPER_HYBRID_PREFERENCE", "local_first").lower()

		self.local_model_name = os.getenv("WHISPER_LOCAL_MODEL", "base")
		self.local_device = os.getenv("WHISPER_LOCAL_DEVICE", "cpu")
		self.local_compute_type = os.getenv("WHISPER_LOCAL_COMPUTE_TYPE", "int8")
		self.local_model = None
		self.local_model_error: Optional[str] = None

		self.api_key = os.getenv("OPENAI_API_KEY")
		self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
		self.openai_model = os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")

	def _ensure_local_model(self) -> bool:
		if self.local_model is not None:
			return True

		try:
			from faster_whisper import WhisperModel  # type: ignore

			self.local_model = WhisperModel(
				self.local_model_name,
				device=self.local_device,
				compute_type=self.local_compute_type,
			)
			self.local_model_error = None
			return True
		except Exception as error:
			self.local_model = None
			self.local_model_error = str(error)
			return False

	def _transcribe_with_local(
		self,
		audio_bytes: bytes,
		filename: str = "segment.webm",
		language: Optional[str] = "en",
	) -> Dict[str, Any]:
		if not self._ensure_local_model():
			return {
				"success": False,
				"error": f"Local Whisper is not available: {self.local_model_error}",
				"status_code": 500,
			}

		extension = os.path.splitext(filename)[1] or ".webm"
		temp_path = ""
		try:
			with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
				temp_file.write(audio_bytes)
				temp_path = temp_file.name

			segments, info = self.local_model.transcribe(
				temp_path,
				language=language,
				vad_filter=True,
			)
			transcript = " ".join((segment.text or "").strip() for segment in segments).strip()

			return {
				"success": True,
				"transcript_text": transcript,
				"raw": {
					"backend": "local",
					"model": self.local_model_name,
					"detected_language": getattr(info, "language", language),
				},
				"status_code": 200,
			}
		except Exception as error:
			return {
				"success": False,
				"error": str(error),
				"status_code": 500,
			}
		finally:
			if temp_path and os.path.exists(temp_path):
				try:
					os.remove(temp_path)
				except OSError:
					pass

	def _transcribe_with_openai(
		self,
		audio_bytes: bytes,
		filename: str = "segment.webm",
		mime_type: str = "video/webm",
		language: Optional[str] = "en",
	) -> Dict[str, Any]:
		if not self.api_key:
			return {
				"success": False,
				"error": "OPENAI_API_KEY is not configured",
				"status_code": 500,
			}

		headers = {
			"Authorization": f"Bearer {self.api_key}",
		}

		files = {
			"file": (filename, audio_bytes, mime_type),
		}
		data = {
			"model": self.openai_model,
		}
		if language:
			data["language"] = language

		try:
			response = requests.post(
				f"{self.base_url}/audio/transcriptions",
				headers=headers,
				files=files,
				data=data,
				timeout=120,
			)
			if response.status_code not in [200, 201]:
				return {
					"success": False,
					"error": response.text or "Whisper transcription failed",
					"status_code": response.status_code,
				}

			payload = response.json() if response.text else {}
			transcript = payload.get("text", "") if isinstance(payload, dict) else ""
			return {
				"success": True,
				"transcript_text": transcript,
				"raw": payload,
				"status_code": 200,
			}
		except Exception as error:
			return {
				"success": False,
				"error": str(error),
				"status_code": 500,
			}

	def is_configured(self) -> bool:
		if self.backend == "local":
			return self._ensure_local_model()
		if self.backend == "openai":
			return bool(self.api_key)
		return self._ensure_local_model() or bool(self.api_key)

	def transcribe_audio_bytes(
		self,
		audio_bytes: bytes,
		filename: str = "segment.webm",
		mime_type: str = "video/webm",
		language: Optional[str] = "en",
	) -> Dict[str, Any]:
		if self.backend == "local":
			return self._transcribe_with_local(
				audio_bytes=audio_bytes,
				filename=filename,
				language=language,
			)

		if self.backend == "openai":
			return self._transcribe_with_openai(
				audio_bytes=audio_bytes,
				filename=filename,
				mime_type=mime_type,
				language=language,
			)

		prefer_openai_first = self.hybrid_preference in {"openai", "openai_first", "quality_first"}

		if prefer_openai_first:
			openai_result = self._transcribe_with_openai(
				audio_bytes=audio_bytes,
				filename=filename,
				mime_type=mime_type,
				language=language,
			)
			if openai_result.get("success"):
				return openai_result

			local_result = self._transcribe_with_local(
				audio_bytes=audio_bytes,
				filename=filename,
				language=language,
			)
			if local_result.get("success"):
				return local_result
		else:
			local_result = self._transcribe_with_local(
				audio_bytes=audio_bytes,
				filename=filename,
				language=language,
			)
			if local_result.get("success"):
				return local_result

			openai_result = self._transcribe_with_openai(
				audio_bytes=audio_bytes,
				filename=filename,
				mime_type=mime_type,
				language=language,
			)
			if openai_result.get("success"):
				return openai_result

		return {
			"success": False,
			"error": (
				f"Hybrid transcription failed. Local error: {local_result.get('error')}. "
				f"OpenAI error: {openai_result.get('error')}"
			),
			"status_code": openai_result.get("status_code", local_result.get("status_code", 500)),
		}


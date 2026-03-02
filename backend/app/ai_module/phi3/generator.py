import os
import re
import json
from typing import Any, Dict, Optional

import requests

from .prompt_templates import build_followup_prompt, build_next_step_decision_prompt


class Phi3FollowupGenerator:
	"""Generate interview follow-up questions using a local Phi-3 model via Ollama."""

	def __init__(self):
		self.provider = os.getenv("PHI3_PROVIDER", "ollama").strip().lower()
		self.model = os.getenv("PHI3_MODEL", "phi3:mini").strip()
		self.base_url = os.getenv("PHI3_OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
		self.timeout_seconds = int(os.getenv("PHI3_TIMEOUT_SECONDS", "60"))

		self.temperature = float(os.getenv("PHI3_TEMPERATURE", "0.25"))
		self.top_p = float(os.getenv("PHI3_TOP_P", "0.9"))
		self.max_tokens = int(os.getenv("PHI3_MAX_TOKENS", "90"))

	def is_configured(self) -> bool:
		if self.provider != "ollama":
			return False
		return bool(self.model and self.base_url)

	def generate_followup_question(
		self,
		original_question: str,
		candidate_answer: str,
		category: Optional[str] = None,
		ideal_answer: Optional[str] = None,
	) -> Dict[str, Any]:
		if not self.is_configured():
			fallback = self._fallback_question(original_question, candidate_answer)
			return {
				"success": True,
				"question": fallback,
				"source": "fallback",
				"error": "Phi-3 provider is not configured",
			}

		prompt = build_followup_prompt(
			original_question=original_question,
			candidate_answer=candidate_answer,
			category=category,
			ideal_answer=ideal_answer,
		)

		try:
			payload = {
				"model": self.model,
				"prompt": prompt,
				"stream": False,
				"options": {
					"temperature": self.temperature,
					"top_p": self.top_p,
					"num_predict": self.max_tokens,
				},
			}

			response = requests.post(
				f"{self.base_url}/api/generate",
				json=payload,
				timeout=self.timeout_seconds,
			)

			if response.status_code != 200:
				fallback = self._fallback_question(original_question, candidate_answer)
				return {
					"success": True,
					"question": fallback,
					"source": "fallback",
					"error": response.text or f"Ollama request failed ({response.status_code})",
				}

			payload = response.json() if response.text else {}
			raw_question = str(payload.get("response") or "").strip()
			question = self._normalize_question(raw_question)

			if not question:
				fallback = self._fallback_question(original_question, candidate_answer)
				return {
					"success": True,
					"question": fallback,
					"source": "fallback",
					"error": "Empty response from Phi-3",
				}

			return {
				"success": True,
				"question": question,
				"source": "phi3_local",
				"raw": payload,
			}
		except Exception as error:
			fallback = self._fallback_question(original_question, candidate_answer)
			return {
				"success": True,
				"question": fallback,
				"source": "fallback",
				"error": str(error),
			}

	def decide_next_step(
		self,
		current_question: str,
		candidate_answer: str,
		remaining_bank_questions: int,
		followup_count_for_current: int,
	) -> Dict[str, Any]:
		if remaining_bank_questions <= 0 or followup_count_for_current >= 1:
			return {
				"success": True,
				"action": "next_bank_question",
				"reason": "flow_constraints",
				"source": "rule",
			}

		if not self.is_configured():
			default_action = self._fallback_action(candidate_answer)
			return {
				"success": True,
				"action": default_action,
				"reason": "provider_not_configured",
				"source": "fallback",
			}

		prompt = build_next_step_decision_prompt(
			current_question=current_question,
			candidate_answer=candidate_answer,
			remaining_bank_questions=remaining_bank_questions,
			followup_count_for_current=followup_count_for_current,
		)

		try:
			payload = {
				"model": self.model,
				"prompt": prompt,
				"stream": False,
				"options": {
					"temperature": 0.1,
					"top_p": 0.8,
					"num_predict": 80,
				},
			}

			response = requests.post(
				f"{self.base_url}/api/generate",
				json=payload,
				timeout=self.timeout_seconds,
			)

			if response.status_code != 200:
				default_action = self._fallback_action(candidate_answer)
				return {
					"success": True,
					"action": default_action,
					"reason": f"ollama_http_{response.status_code}",
					"source": "fallback",
				}

			response_payload = response.json() if response.text else {}
			raw_text = str(response_payload.get("response") or "").strip()
			parsed = self._parse_decision_json(raw_text)

			if parsed["action"] not in {"follow_up", "next_bank_question"}:
				parsed["action"] = self._fallback_action(candidate_answer)
				parsed["reason"] = parsed.get("reason") or "unrecognized_action"

			return {
				"success": True,
				"action": parsed["action"],
				"reason": parsed.get("reason") or "phi3_decision",
				"source": "phi3_local",
			}
		except Exception:
			default_action = self._fallback_action(candidate_answer)
			return {
				"success": True,
				"action": default_action,
				"reason": "exception_fallback",
				"source": "fallback",
			}

	def _normalize_question(self, text: str) -> str:
		if not text:
			return ""

		cleaned = text.replace("\n", " ").strip()
		cleaned = re.sub(r"\s+", " ", cleaned)
		cleaned = re.sub(r"^Follow-?up question\s*:\s*", "", cleaned, flags=re.IGNORECASE)
		cleaned = cleaned.strip('"\'` ')

		if "?" in cleaned:
			cleaned = cleaned.split("?")[0].strip() + "?"
		else:
			cleaned = f"{cleaned.rstrip('.') }?" if cleaned else ""

		return cleaned

	def _fallback_question(self, original_question: str, candidate_answer: str) -> str:
		answer = (candidate_answer or "").strip()
		if len(answer) < 30:
			return "Can you walk me through a specific example with more detail on what you did and what happened after?"

		if any(keyword in answer.lower() for keyword in ["result", "outcome", "impact", "improved", "increased"]):
			return "What specific metric or concrete evidence best shows the impact of that approach?"

		if any(keyword in answer.lower() for keyword in ["challenge", "difficult", "problem", "issue"]):
			return "What was the hardest decision you made in that situation, and why did you choose that approach?"

		return "If you faced the same situation again, what would you do differently and why?"

	def _fallback_action(self, candidate_answer: str) -> str:
		answer = (candidate_answer or "").strip()
		if len(answer) < 60:
			return "follow_up"
		if not any(keyword in answer.lower() for keyword in ["result", "impact", "outcome", "%", "increased", "reduced"]):
			return "follow_up"
		return "next_bank_question"

	def _parse_decision_json(self, raw_text: str) -> Dict[str, str]:
		if not raw_text:
			return {"action": "", "reason": "empty_response"}

		candidate = raw_text.strip()
		match = re.search(r"\{.*\}", candidate, re.DOTALL)
		if match:
			candidate = match.group(0)

		try:
			payload = json.loads(candidate)
			action = str(payload.get("action") or "").strip()
			reason = str(payload.get("reason") or "").strip()
			return {"action": action, "reason": reason}
		except Exception:
			lower = raw_text.lower()
			if "follow_up" in lower or "follow-up" in lower:
				return {"action": "follow_up", "reason": "parsed_from_text"}
			if "next_bank_question" in lower or "next bank" in lower:
				return {"action": "next_bank_question", "reason": "parsed_from_text"}
			return {"action": "", "reason": "parse_failed"}


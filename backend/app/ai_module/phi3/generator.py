import os
import re
import json
import logging
from typing import Any, Dict, Optional

import requests

from .prompt_templates import build_followup_prompt, build_next_step_decision_prompt


logger = logging.getLogger(__name__)


class Phi3FollowupGenerator:
	"""Generate interview follow-up questions using a local Phi-3 model via Ollama."""

	def __init__(self):
		self.provider = os.getenv("PHI3_PROVIDER", "ollama").strip().lower()
		self.model = os.getenv("PHI3_MODEL", "phi3:mini").strip()
		self.base_url = os.getenv("PHI3_OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
		self.timeout_seconds = int(os.getenv("PHI3_TIMEOUT_SECONDS", "60"))

		self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
		self.openai_base_url = os.getenv("PHI3_OPENAI_BASE_URL", os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
		self.openai_model = os.getenv("PHI3_OPENAI_MODEL", "gpt-4o-mini").strip()

		self.temperature = float(os.getenv("PHI3_TEMPERATURE", "0.25"))
		self.top_p = float(os.getenv("PHI3_TOP_P", "0.9"))
		self.max_tokens = int(os.getenv("PHI3_MAX_TOKENS", "90"))

		logger.info(
			"Phi3FollowupGenerator initialized provider=%s openai_configured=%s ollama_model=%s openai_model=%s timeout=%ss",
			self.provider,
			bool(self.openai_api_key),
			self.model,
			self.openai_model,
			self.timeout_seconds,
		)

	def is_configured(self) -> bool:
		if self.provider == "ollama":
			return bool(self.model and self.base_url)
		if self.provider == "openai":
			return bool(self.openai_api_key and self.openai_model and self.openai_base_url)
		return False

	def _generate_with_ollama(self, prompt: str, temperature: float, top_p: float, max_tokens: int) -> Dict[str, Any]:
		payload = {
			"model": self.model,
			"prompt": prompt,
			"stream": False,
			"options": {
				"temperature": temperature,
				"top_p": top_p,
				"num_predict": max_tokens,
			},
		}

		response = requests.post(
			f"{self.base_url}/api/generate",
			json=payload,
			timeout=self.timeout_seconds,
		)

		if response.status_code != 200:
			return {
				"success": False,
				"error": response.text or f"Ollama request failed ({response.status_code})",
			}

		response_payload = response.json() if response.text else {}
		raw_text = str(response_payload.get("response") or "").strip()
		return {
			"success": True,
			"text": raw_text,
			"source": "phi3_local",
			"raw": response_payload,
		}

	def _generate_with_openai(self, prompt: str, temperature: float, top_p: float, max_tokens: int) -> Dict[str, Any]:
		headers = {
			"Authorization": f"Bearer {self.openai_api_key}",
			"Content-Type": "application/json",
		}

		payload = {
			"model": self.openai_model,
			"messages": [
				{
					"role": "system",
					"content": "You are an expert interview assistant.",
				},
				{
					"role": "user",
					"content": prompt,
				},
			],
			"temperature": temperature,
			"top_p": top_p,
			"max_tokens": max_tokens,
		}

		response = requests.post(
			f"{self.openai_base_url}/chat/completions",
			headers=headers,
			json=payload,
			timeout=self.timeout_seconds,
		)

		if response.status_code not in [200, 201]:
			return {
				"success": False,
				"error": response.text or f"OpenAI request failed ({response.status_code})",
			}

		response_payload = response.json() if response.text else {}
		choices = response_payload.get("choices") if isinstance(response_payload, dict) else []
		first_choice = choices[0] if isinstance(choices, list) and choices else {}
		message = first_choice.get("message") if isinstance(first_choice, dict) else {}
		raw_text = str(message.get("content") or "").strip() if isinstance(message, dict) else ""

		return {
			"success": True,
			"text": raw_text,
			"source": "openai",
			"raw": response_payload,
		}

	def _generate_text(self, prompt: str, temperature: float, top_p: float, max_tokens: int) -> Dict[str, Any]:
		if self.provider == "ollama":
			return self._generate_with_ollama(
				prompt=prompt,
				temperature=temperature,
				top_p=top_p,
				max_tokens=max_tokens,
			)
		if self.provider == "openai":
			return self._generate_with_openai(
				prompt=prompt,
				temperature=temperature,
				top_p=top_p,
				max_tokens=max_tokens,
			)
		return {
			"success": False,
			"error": f"Unsupported PHI3_PROVIDER value: {self.provider}",
		}

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
				"error": "Follow-up provider is not configured",
			}

		# Pre-check: if answer looks incoherent, use fallback logic instead of Phi3
		if self._is_incoherent_answer(candidate_answer):
			fallback = self._fallback_question(original_question, candidate_answer)
			return {
				"success": True,
				"question": fallback,
				"source": "fallback",
				"reason": "incoherent_answer_detected",
			}

		prompt = build_followup_prompt(
			original_question=original_question,
			candidate_answer=candidate_answer,
			category=category,
			ideal_answer=ideal_answer,
		)

		try:
			generation = self._generate_text(
				prompt=prompt,
				temperature=self.temperature,
				top_p=self.top_p,
				max_tokens=self.max_tokens,
			)

			if not generation.get("success"):
				fallback = self._fallback_question(original_question, candidate_answer)
				return {
					"success": True,
					"question": fallback,
					"source": "fallback",
					"error": generation.get("error") or "Generation request failed",
				}

			raw_question = str(generation.get("text") or "").strip()
			
			# Check if Phi3 detected incoherent answer
			if "SKIP_FOLLOWUP" in raw_question or "skip_followup" in raw_question.lower():
				fallback = self._fallback_question(original_question, candidate_answer)
				return {
					"success": True,
					"question": fallback,
					"source": "fallback",
					"reason": "phi3_detected_incoherent_answer",
				}
			
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
				"source": generation.get("source", "unknown"),
				"raw": generation.get("raw"),
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
			generation = self._generate_text(
				prompt=prompt,
				temperature=0.1,
				top_p=0.8,
				max_tokens=80,
			)

			if not generation.get("success"):
				default_action = self._fallback_action(candidate_answer)
				return {
					"success": True,
					"action": default_action,
					"reason": "provider_request_failed",
					"source": "fallback",
				}

			raw_text = str(generation.get("text") or "").strip()
			parsed = self._parse_decision_json(raw_text)

			if parsed["action"] not in {"follow_up", "next_bank_question"}:
				parsed["action"] = self._fallback_action(candidate_answer)
				parsed["reason"] = parsed.get("reason") or "unrecognized_action"

			return {
				"success": True,
				"action": parsed["action"],
				"reason": parsed.get("reason") or "phi3_decision",
				"source": generation.get("source", "unknown"),
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
		cleaned = cleaned.strip('"\'\'` ')

		if "?" in cleaned:
			cleaned = cleaned.split("?")[0].strip() + "?"
		else:
			cleaned = f"{cleaned.rstrip('. ') }?" if cleaned else ""

		return cleaned

	def _fallback_question(self, original_question: str, candidate_answer: str) -> str:
		answer = (candidate_answer or "").strip().lower()

		# Short answers need more detail
		if len(answer) < 30:
			return "Can you walk me through a specific example with more detail on what you did and what happened after?"

		# Impact/results - expanded keyword coverage
		impact_keywords = [
			"result", "outcome", "impact", "improved", "increased", "reduced", "decreased",
			"achieved", "accomplished", "delivered", "saved", "gained", "success", "benefit",
			"performance", "efficiency", "revenue", "cost", "metric", "kpi", "roi", "value"
		]
		if any(keyword in answer for keyword in impact_keywords):
			return "What specific metric or concrete evidence best shows the impact of that approach?"

		# Challenges/problems - expanded keyword coverage
		challenge_keywords = [
			"challenge", "difficult", "problem", "issue", "struggle", "obstacle", "barrier",
			"conflict", "disagreement", "mistake", "error", "failure", "setback", "blocker",
			"constraint", "limitation", "risk", "crisis", "pressure", "deadline", "urgent"
		]
		if any(keyword in answer for keyword in challenge_keywords):
			return "What was the hardest decision you made in that situation, and why did you choose that approach?"

		# Technical implementation details
		technical_keywords = [
			"code", "coding", "programming", "algorithm", "database", "api", "framework",
			"language", "library", "tool", "technology", "system", "architecture", "design",
			"development", "software", "implementation", "debug", "optimize", "scale"
		]
		if any(keyword in answer for keyword in technical_keywords):
			return "What technical trade-offs did you consider when implementing that solution?"

		# Teamwork/collaboration
		team_keywords = [
			"team", "colleague", "manager", "stakeholder", "client", "customer", "user",
			"collaborate", "communication", "meeting", "discussion", "feedback", "review",
			"leadership", "mentoring", "training", "presentation", "documentation"
		]
		if any(keyword in answer for keyword in team_keywords):
			return "How did you ensure everyone was aligned on that approach?"

		# Learning/growth
		learning_keywords = [
			"learn", "learned", "learning", "new", "first time", "research", "study",
			"skill", "knowledge", "experience", "growth", "development", "training",
			"course", "tutorial", "documentation", "best practice", "pattern"
		]
		if any(keyword in answer for keyword in learning_keywords):
			return "What was the most valuable insight you gained from that experience?"

		# Process/methodology
		process_keywords = [
			"process", "methodology", "approach", "strategy", "plan", "workflow", "procedure",
			"agile", "scrum", "testing", "deployment", "ci/cd", "review", "quality", "standard"
		]
		if any(keyword in answer for keyword in process_keywords):
			return "What made you choose that particular approach over alternatives?"

		# Diverse fallback rotation - no more repetitive "same situation" question
		fallback_questions = [
			"What was the most important factor in your decision-making process there?",
			"How did you validate that your approach was working as expected?",
			"What would you tell someone facing a similar situation?",
			"What aspect of that experience do you think was most critical to the outcome?",
			"How did you know you were on the right track during that process?"
		]

		# Simple rotation based on answer length to add variety
		fallback_index = len(answer) % len(fallback_questions)
		return fallback_questions[fallback_index]

	def _is_incoherent_answer(self, answer: str) -> bool:
		"""Detect if an answer is too broken/nonsensical to follow up on."""
		lower = answer.lower()
		
		# Question marks suggest confusion/uncertainty
		question_mark_count = answer.count("?")
		if question_mark_count >= 2:
			return True
		
		# Common incoherence markers
		incoherence_markers = [
			"i don't know",
			"i don't really know",
			"i'm not sure",
			"not really sure",
			"kind of",
			"umm",
			"uh",
			"um,",
			"er,",
			"actually, i haven't",
			"i haven't really thought",
			"is that i don't",
			"that i don't",
		]
		if any(marker in lower for marker in incoherence_markers):
			return True
		
		# Very fragmented answers (lots of short segments)
		if answer.count(".") > 8 and len(answer) < 150:
			return True
		
		# Answer too short relative to complexity of question
		if len(answer) < 30:
			# Very short answers are often incomplete/confused
			if "?" in lower:
				return True
		
		return False

	def _fallback_action(self, candidate_answer: str) -> str:
		answer = (candidate_answer or "").strip()
		
		# Incoherent answers should NOT get follow-ups
		if self._is_incoherent_answer(answer):
			return "next_bank_question"
		
		# Short but coherent answers need more detail
		if len(answer) < 60:
			return "follow_up"
		
		# Check for results/impact - strong indicator of complete answer
		if any(keyword in answer.lower() for keyword in ["result", "impact", "outcome", "%", "increased", "reduced", "improved", "achieved", "delivered"]):
			return "next_bank_question"
		
		# By default, follow up on longer answers without clear outcomes
		return "follow_up"

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

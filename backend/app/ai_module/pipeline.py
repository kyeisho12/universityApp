from typing import Any, Dict, Optional

from app.ai_module.phi3 import Phi3FollowupGenerator


class InterviewAIPipeline:
	"""Minimal AI pipeline entry point for interview-related generation tasks."""

	def __init__(self):
		self.followup_generator = Phi3FollowupGenerator()

	def generate_followup_question(
		self,
		original_question: str,
		candidate_answer: str,
		category: Optional[str] = None,
		ideal_answer: Optional[str] = None,
	) -> Dict[str, Any]:
		return self.followup_generator.generate_followup_question(
			original_question=original_question,
			candidate_answer=candidate_answer,
			category=category,
			ideal_answer=ideal_answer,
		)


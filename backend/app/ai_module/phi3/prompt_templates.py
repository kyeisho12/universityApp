from typing import Optional


def build_followup_prompt(
	original_question: str,
	candidate_answer: str,
	category: Optional[str] = None,
	ideal_answer: Optional[str] = None,
) -> str:
	interview_category = (category or "general").strip().lower()
	ideal_context = (ideal_answer or "").strip()

	prompt = (
		"You are an expert interviewer. Generate exactly ONE follow-up question.\n"
		"Goal: probe deeper into specific details, impact, trade-offs, and measurable outcomes.\n"
		"Rules:\n"
		"1) Return only one concise question.\n"
		"2) Do not include explanations, bullets, labels, or quotes.\n"
		"3) Keep it conversational and job-interview appropriate.\n"
		"4) Prefer asking about concrete evidence or decision-making.\n\n"
		f"Interview category: {interview_category}\n"
		f"Original question: {original_question.strip()}\n"
		f"Candidate answer: {candidate_answer.strip()}\n"
	)

	if ideal_context:
		prompt += f"Ideal-answer guidance: {ideal_context}\n"

	prompt += "\nGenerate one follow-up question now:"
	return prompt


def build_next_step_decision_prompt(
	current_question: str,
	candidate_answer: str,
	remaining_bank_questions: int,
	followup_count_for_current: int,
) -> str:
	return (
		"You are an interview flow controller. Decide the next step after a candidate answer.\n"
		"Choose exactly one action:\n"
		"- follow_up: ask one deeper follow-up for the same topic\n"
		"- next_bank_question: move to the next question from the question bank\n\n"
		"Decision policy:\n"
		"1) If remaining_bank_questions <= 0, choose next_bank_question.\n"
		"2) If followup_count_for_current >= 1, choose next_bank_question.\n"
		"3) Prefer follow_up only when the answer is vague, missing details, or lacks measurable outcomes.\n"
		"4) Prefer next_bank_question when the answer is already specific and complete.\n\n"
		f"Current question: {current_question.strip()}\n"
		f"Candidate answer: {candidate_answer.strip()}\n"
		f"remaining_bank_questions: {remaining_bank_questions}\n"
		f"followup_count_for_current: {followup_count_for_current}\n\n"
		"Return strict JSON only with this shape:\n"
		"{\"action\":\"follow_up\"|\"next_bank_question\",\"reason\":\"short reason\"}"
	)


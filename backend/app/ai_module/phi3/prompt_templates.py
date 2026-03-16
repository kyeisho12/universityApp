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
		"You are a job interviewer. Write ONE follow-up question based only on what the candidate said.\n"
		"- One short question only. No labels, bullets, quotes, or explanations.\n"
		"- Use only details the candidate explicitly mentioned. Do not introduce new topics.\n"
		"- If the answer is vague, ask the candidate to clarify something they already said.\n\n"
		f"Category: {interview_category}\n"
		f"Original question: {original_question.strip()}\n"
		f"Candidate answer: {candidate_answer.strip()}\n"
	)

	if ideal_context:
		prompt += f"What a strong answer covers: {ideal_context}\n"

	prompt += "\nFollow-up question:"
	return prompt


def build_next_step_decision_prompt(
	current_question: str,
	candidate_answer: str,
	remaining_bank_questions: int,
	followup_count_for_current: int,
) -> str:
	return (
		"You are an interview flow controller. Output JSON only.\n"
		"Choose action:\n"
		"- \"follow_up\" if the answer is vague, missing key details, or lacks a measurable outcome\n"
		"- \"next_bank_question\" if the answer is specific and complete\n\n"
		"Rules: always choose next_bank_question if followup_count_for_current >= 1 or remaining_bank_questions <= 0.\n\n"
		f"current_question: {current_question.strip()}\n"
		f"candidate_answer: {candidate_answer.strip()}\n"
		f"remaining_bank_questions: {remaining_bank_questions}\n"
		f"followup_count_for_current: {followup_count_for_current}\n\n"
		'Output exactly: {"action":"follow_up","reason":"one short reason"} or {"action":"next_bank_question","reason":"one short reason"}\n'
		"JSON:"
	)


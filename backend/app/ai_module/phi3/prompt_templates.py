from typing import Dict, List, Optional


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
		"- If the answer is vague or incomplete, ask the candidate to clarify or provide more detail.\n"
		"- If the answer is incoherent, rambling, or doesn't make sense, respond with just: SKIP_FOLLOWUP\n"
		"- Only generate a follow-up if the answer is coherent enough to build upon.\n\n"
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
	bank_question_pool: Optional[List[Dict]] = None,
) -> str:
	has_pool = bool(bank_question_pool)

	pool_section = ""
	selected_id_rule = ""
	output_next = '{"action":"next_bank_question","reason":"one short reason"}'

	if has_pool:
		pool_lines = "\n".join(
			f"{i + 1}. [{q['id']}] {q['question']}"
			for i, q in enumerate(bank_question_pool)  # type: ignore[union-attr]
		)
		pool_section = f"\nAvailable bank questions:\n{pool_lines}\n\n"
		selected_id_rule = (
			'- When action is "next_bank_question", also add "selected_question_id" '
			"with the id of the bank question most relevant to the candidate's answer topic.\n"
		)
		output_next = '{"action":"next_bank_question","reason":"one short reason","selected_question_id":"<id from list>"}'

	return (
		"You are an interview flow controller. Output JSON only.\n"
		"Choose action:\n"
		'- "follow_up" if the answer is vague, missing key details, or lacks a measurable outcome (but is still coherent)\n'
		'- "next_bank_question" if the answer is specific, complete, OR if the answer is incoherent/nonsensical/off-topic\n\n'
		"IMPORTANT: If the answer is incomplete, rambling, doesn't make sense, or doesn't address the question, ALWAYS choose \"next_bank_question\".\n"
		"Only choose \"follow_up\" for coherent answers that need more depth or specifics.\n\n"
		"Rules: always choose next_bank_question if followup_count_for_current >= 1 or remaining_bank_questions <= 0.\n\n"
		f"{pool_section}"
		f"{selected_id_rule}"
		f"current_question: {current_question.strip()}\n"
		f"candidate_answer: {candidate_answer.strip()}\n"
		f"remaining_bank_questions: {remaining_bank_questions}\n"
		f"followup_count_for_current: {followup_count_for_current}\n\n"
		f'Output exactly: {{"action":"follow_up","reason":"one short reason"}} or {output_next}\n'
		"JSON:"
	)

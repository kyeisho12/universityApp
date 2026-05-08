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
		"- If the original question asks about future plans, goals, or self-improvement: ask about their specific plan, next steps, or what they are already doing — NOT past examples.\n"
		"- If the original question asks about past experience or behavior: ask for specific details (what exactly happened, what was the outcome).\n"
		"- If the original question asks about personal qualities, strengths, weaknesses, or self-description: ask for a specific example that demonstrates that quality. Do NOT ask what they would do differently or reference a past situation they did not explicitly describe.\n"
		"- If the answer is very short or lacks any specific details (no names, examples, roles, or outcomes): ask a broad opening question like 'Can you tell me more about that?' or 'What specifically did you work on?' — do NOT probe about details the candidate did not mention.\n"
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
	conversation_history: Optional[List[Dict]] = None,
) -> str:
	has_pool = bool(bank_question_pool)
	has_history = bool(conversation_history)

	history_section = ""
	pool_section = ""
	selected_id_rule = ""
	output_next_bank = '{"action":"next_bank_question","reason":"one short reason"}'
	output_next_new = '{"action":"next_question_new","reason":"one short reason","generated_question":"<your question>"}'

	if has_history:
		history_lines = "\n".join(
			f"Q: {h.get('question', '').strip()}\nA: {str(h.get('answer', ''))[:200].strip()}"
			for h in conversation_history[-3:]  # type: ignore[index]
		)
		history_section = f"\nConversation history:\n{history_lines}\n"

	if has_pool:
		pool_lines = "\n".join(
			f"{i + 1}. [{q['id']}] {q['question']}"
			for i, q in enumerate(bank_question_pool)  # type: ignore[union-attr]
		)
		pool_section = f"\nAvailable bank questions:\n{pool_lines}\n\n"
		selected_id_rule = (
			'- When action is "next_bank_question", also add "selected_question_id" '
			"with the id of the bank question most relevant to the conversation topic.\n"
		)
		output_next_bank = '{"action":"next_bank_question","reason":"one short reason","selected_question_id":"<id from list>"}'

	return (
		"You are an interview flow controller. Output JSON only.\n"
		"Choose action:\n"
		'- "follow_up": answer is coherent but vague or missing key details\n'
		'- "next_bank_question": pick the most contextually relevant question from the bank list\n'
		'- "next_question_new": generate a new contextual question when NO bank question fits the conversation topic\n\n'
		"For opening or introduction questions (for example, tell me about yourself, introduce yourself, or walk me through your background),\n"
		"treat a coherent self-introduction with identity, background, and experience as complete enough to move on unless it is evasive, incoherent, or extremely brief.\n\n"
		"Prefer next_bank_question when a bank question matches the conversation topic.\n"
		"Use next_question_new only when the topic has no match in the bank.\n"
		"ALWAYS choose next_bank_question or next_question_new (not follow_up) if:\n"
		"  followup_count_for_current >= 1, or remaining_bank_questions <= 0,\n"
		"  or the answer is incoherent, rambling, or off-topic.\n\n"
		f"{history_section}"
		f"{pool_section}"
		f"{selected_id_rule}"
		f"current_question: {current_question.strip()}\n"
		f"candidate_answer: {candidate_answer.strip()}\n"
		f"remaining_bank_questions: {remaining_bank_questions}\n"
		f"followup_count_for_current: {followup_count_for_current}\n\n"
		f'Output: {{"action":"follow_up","reason":"..."}} or {output_next_bank} or {output_next_new}\n'
		"JSON:"
	)

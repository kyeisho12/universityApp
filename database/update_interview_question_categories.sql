-- Update existing interview_question_bank categories to official TSU groupings
-- Run this after create_interview_question_bank.sql if rows already exist.

UPDATE public.interview_question_bank
SET category = CASE question_normalized
  WHEN 'tell me something about yourself.' THEN 'behavioral'
  WHEN 'what are your biggest strengths?' THEN 'behavioral'
  WHEN 'what is your biggest weakness?' THEN 'behavioral'
  WHEN 'why should we hire you?' THEN 'behavioral'
  WHEN 'what is your professional achievement you''re most proud of?' THEN 'behavioral'
  WHEN 'what kind of work environment do you like best?' THEN 'behavioral'
  WHEN 'where do you see yourself in five years?' THEN 'behavioral'
  WHEN 'give examples of ideas you''ve had or implemented.' THEN 'behavioral'
  WHEN 'who has impacted you most in your career and how?' THEN 'behavioral'
  WHEN 'how do you feel about working weekends or late hours?' THEN 'situational'
  WHEN 'what would your first 30, 60, or 90 days look like in this role?' THEN 'situational'
  WHEN 'are you a team player?' THEN 'situational'
  WHEN 'are you a risk taker?' THEN 'situational'
  WHEN 'how do you deal with pressure or stressful situations?' THEN 'situational'
  WHEN 'do you prefer hard work or smart work?' THEN 'situational'
  WHEN 'how quickly do you adapt to new technology?' THEN 'situational'
  WHEN 'what do you think our company/organization could do better?' THEN 'situational'
  WHEN 'give an example of how you have handled a challenge in school or workplace before.' THEN 'situational'
  WHEN 'give an example of when you performed well under pressure.' THEN 'situational'
  WHEN 'give an example of when you showed leadership qualities.' THEN 'situational'
  WHEN 'tell me about a time when you had to give someone difficult feedback. how did you handle it?' THEN 'situational'
  WHEN 'what is your greatest failure and what did you learn from it?' THEN 'situational'
  WHEN 'what are you looking for in terms of career development?' THEN 'career_development'
  WHEN 'how do you want to improve yourself in the next year?' THEN 'career_development'
  WHEN 'what kind of goals would you have in mind if you got this job?' THEN 'career_development'
  ELSE category
END,
updated_at = NOW()
WHERE source_model = 'tsu-question-bank-v1';

-- Keep trace that "Who has impacted..." also belongs to career development
UPDATE public.interview_question_bank
SET generation_context = generation_context || '{"secondary_category":"career_development"}'::jsonb,
    updated_at = NOW()
WHERE question_normalized = 'who has impacted you most in your career and how?';

export type DatasetItem = {
  question: string;
  exampleAnswer: string;
  score: number; // 1-5
  breakdown: {
    situation: number;
    task: number;
    action: number;
    result: number;
    reflection: number;
  };
};

// Small example dataset for a Roberta-style evaluator. These are synthetic
// Q/A pairs with a human-assigned 1-5 score and STAR breakdown.
export const robertaDataset: DatasetItem[] = [
  {
    question: "Tell me about a time you led a team to finish a project on a tight deadline.",
    exampleAnswer:
      "When I was working on an app redesign (situation), I was assigned to lead a team of four (task). I delegated tasks, set daily check-ins, and implemented a lightweight CI process to catch regressions early (action). We finished two days ahead of the deadline and saw a 12% drop in reported UI bugs (result). From this I learned the value of small, frequent integrations and clearer ownership (reflection).",
    score: 5,
    breakdown: { situation: 5, task: 5, action: 5, result: 5, reflection: 5 },
  },
  {
    question: "Describe a time you had to resolve a conflict with a coworker.",
    exampleAnswer:
      "In a sprint, a coworker and I disagreed on the feature scope (situation). I took responsibility to schedule a meeting and listen to concerns (task). We aligned on acceptance criteria and split work accordingly (action). The feature shipped with fewer reworks and both of us improved collaboration (result). I learned to focus on criteria over opinions (reflection).",
    score: 4,
    breakdown: { situation: 4, task: 4, action: 4, result: 4, reflection: 4 },
  },
  {
    question: "Give an example of when you improved a process.",
    exampleAnswer:
      "At my last internship, builds were failing often (situation). I was tasked to reduce failures (task). I added automated linting and a test step to the pipeline (action). The build failure rate dropped by 60% (result). I learned that small automation pays off (reflection).",
    score: 5,
    breakdown: { situation: 5, task: 4, action: 5, result: 5, reflection: 4 },
  },
  {
    question: "Tell me about a mistake you made at work.",
    exampleAnswer:
      "I once merged code without running tests (situation). I owned the mistake and reverted the change (task). I added a local pre-commit hook and documented the proper workflow (action). The team saw fewer regressions after (result). I now always run tests before merging (reflection).",
    score: 4,
    breakdown: { situation: 4, task: 3, action: 4, result: 4, reflection: 4 },
  },
  {
    question: "How do you prioritize competing tasks?",
    exampleAnswer:
      "When multiple tasks arrive (situation), I list them by impact and effort (task). I communicate priorities to stakeholders and set checkpoints (action). High-impact tasks were delivered first and stakeholders were satisfied (result). I refined my decision criteria over time (reflection).",
    score: 3,
    breakdown: { situation: 3, task: 3, action: 3, result: 3, reflection: 2 },
  },
];

export default robertaDataset;

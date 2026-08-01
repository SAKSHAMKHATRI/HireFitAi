'use server';
/**
 * @fileOverview Evaluates the user's interview answers and returns a structured performance report.
 *
 * - evaluateInterviewAnswers - A function that evaluates interview answers.
 * - EvaluateInterviewAnswersInput - The input type for evaluateInterviewAnswers.
 * - EvaluateInterviewAnswersOutput - The return type for evaluateInterviewAnswers.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnsweredQuestionSchema = z.object({
  question: z.string().describe('The interview question that was asked.'),
  category: z.string().describe('The category of the question, e.g. Technical or Behavioral.'),
  difficulty: z.string().describe('The difficulty of the question: Easy, Medium, or Hard.'),
  answer: z.string().describe('The exact answer the candidate provided for this question.'),
});

const EvaluateInterviewAnswersInputSchema = z.object({
  targetRole: z.string().describe('The target job role of the mock interview.'),
  experienceLevel: z.string().describe('The candidate experience level configured for the interview.'),
  interviewType: z.string().describe('The interview type configured for the interview.'),
  difficulty: z.string().describe('The overall difficulty configured for the interview.'),
  answeredQuestions: z
    .array(AnsweredQuestionSchema)
    .min(1)
    .describe('Only the questions the candidate actually answered. Skipped questions are excluded.'),
});
export type EvaluateInterviewAnswersInput = z.infer<
  typeof EvaluateInterviewAnswersInputSchema
>;

const EvaluateInterviewAnswersOutputSchema = z.object({
  communication: z
    .number()
    .min(0)
    .max(100)
    .describe('Clarity, structure, and articulation score from 0 to 100.'),
  technicalAccuracy: z
    .number()
    .min(0)
    .max(100)
    .describe('Technical correctness and depth of the answers from 0 to 100.'),
  problemSolving: z
    .number()
    .min(0)
    .max(100)
    .describe('Analytical and problem-solving quality of the answers from 0 to 100.'),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe('Perceived confidence, decisiveness, and composure from 0 to 100.'),
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Overall interview performance score from 0 to 100.'),
  hiringRecommendation: z
    .string()
    .describe(
      'A clear hiring recommendation, e.g. Strong Hire, Hire, Lean Hire, or No Hire, based only on the answers.'
    ),
  strengths: z
    .array(z.string())
    .describe('Specific strengths demonstrated in the answers, each grounded in the answer text.'),
  weaknesses: z
    .array(z.string())
    .describe('Specific weaknesses visible in the answers, each grounded in the answer text.'),
  missedConcepts: z
    .array(z.string())
    .describe(
      'Important concepts or points the candidate missed or did not mention when answering the questions.'
    ),
  recommendedTopics: z
    .array(z.string())
    .describe('Topics the candidate should study next to improve for this role.'),
  practicePlan: z
    .array(z.string())
    .describe('A step-by-step practice plan with concrete actions to improve interview performance.'),
});
export type EvaluateInterviewAnswersOutput = z.infer<
  typeof EvaluateInterviewAnswersOutputSchema
>;

export async function evaluateInterviewAnswers(
  input: EvaluateInterviewAnswersInput
): Promise<EvaluateInterviewAnswersOutput> {
  return evaluateInterviewAnswersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateInterviewAnswersPrompt',
  input: {schema: EvaluateInterviewAnswersInputSchema},
  output: {schema: EvaluateInterviewAnswersOutputSchema},
  prompt: `You are HireFit AI, a rigorous interview evaluator for a mock {{{targetRole}}} interview at {{{experienceLevel}}} level (interview type: {{{interviewType}}}, difficulty: {{{difficulty}}}).

Evaluate ONLY the candidate's provided answers. 

Accuracy rules:
- Never fabricate. Every strength, weakness, missed concept, and score must be grounded in the provided answer text.
- Only the questions listed below were answered. Do not evaluate or comment on questions that are not listed, and do not invent additional questions.
- If an answer is short, vague, or off-topic, reflect that honestly in the scores and weaknesses.
- If the candidate's answer is technically wrong, mark the technical accuracy down and explain why in the weaknesses.
- Recommended topics and the practice plan must be derived from the gaps visible in the answers.
- Scores should be calibrated against what a strong candidate at the configured experience level would deliver.
- The hiring recommendation must follow directly from the overall score and answer quality.

Answered questions and answers:
{{#each answeredQuestions}}
Question {{{this.question}}} ({{{this.category}}}, {{{this.difficulty}}})
Candidate answer: {{{this.answer}}}
{{/each}}

Return strict structured JSON matching the output schema.`,
});

const evaluateInterviewAnswersFlow = ai.defineFlow(
  {
    name: 'evaluateInterviewAnswersFlow',
    inputSchema: EvaluateInterviewAnswersInputSchema,
    outputSchema: EvaluateInterviewAnswersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Gemini returned an empty interview evaluation.');
    }
    return output;
  }
);

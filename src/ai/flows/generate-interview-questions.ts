'use server';
/**
 * @fileOverview Generates a fresh set of interview questions for the AI Interview Simulator.
 *
 * - generateInterviewQuestions - A function that generates interview questions.
 * - GenerateInterviewQuestionsInput - The input type for generateInterviewQuestions.
 * - GenerateInterviewQuestionsOutput - The return type for generateInterviewQuestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  targetRole: z.string().describe('The target job role, e.g. "Software Engineer".'),
  experienceLevel: z
    .string()
    .describe('The candidate experience level: Fresher, Junior, Mid, or Senior.'),
  interviewType: z
    .string()
    .describe('The interview type: HR, Technical, Behavioral, or Mixed.'),
  difficulty: z
    .string()
    .describe('The overall difficulty level: Easy, Medium, or Hard.'),
});
export type GenerateInterviewQuestionsInput = z.infer<
  typeof GenerateInterviewQuestionsInputSchema
>;

const InterviewQuestionSchema = z.object({
  question: z
    .string()
    .describe('The interview question text, phrased exactly as an interviewer would ask it.'),
  hint: z
    .string()
    .describe(
      'A brief, practical hint that helps the candidate structure a strong answer without giving the answer away.'
    ),
  difficulty: z
    .string()
    .describe('The difficulty of this individual question: Easy, Medium, or Hard.'),
  category: z
    .string()
    .describe(
      'The category of this question, e.g. Technical, Behavioral, HR, Problem Solving, or System Design.'
    ),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

const GenerateInterviewQuestionsOutputSchema = z.object({
  questions: z
    .array(InterviewQuestionSchema)
    .min(1)
    .describe('The complete set of unique interview questions (exactly 10).'),
});
export type GenerateInterviewQuestionsOutput = z.infer<
  typeof GenerateInterviewQuestionsOutputSchema
>;

export async function generateInterviewQuestions(
  input: GenerateInterviewQuestionsInput
): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are HireFit AI, an expert technical and behavioral interviewer.

Create a realistic interview question set for a mock interview.

Constraints:
- Generate exactly 10 questions.
- Every question must be unique. Never repeat, rephrase, or duplicate a question in this set.
- Tailor every question to the target role, experience level, interview type, and difficulty below.
- Match the questions to the candidate's seniority: Fresher and Junior candidates get foundational, skill-based questions; Senior candidates get leadership, architecture, and trade-off questions.
- For a "Technical" type, focus on technical and problem-solving questions. For "HR", focus on culture-fit, motivation, and background questions. For "Behavioral", focus on STAR-style situational questions. For "Mixed", combine all categories naturally.
- Question difficulty should roughly match the requested overall difficulty, with some natural variation across the set.
- Each question must include a practical hint that helps structure an answer, and a category (Technical, Behavioral, HR, Problem Solving, System Design, etc.).

Target Role: {{{targetRole}}}
Experience Level: {{{experienceLevel}}}
Interview Type: {{{interviewType}}}
Difficulty: {{{difficulty}}}

Return strict structured JSON matching the output schema.`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || output.questions.length === 0) {
      throw new Error('Gemini returned an empty interview question set.');
    }
    return output;
  }
);

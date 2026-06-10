'use server';
/**
 * @fileOverview A Genkit flow for evaluating a resume against a job description.
 *
 * - hireResumeEvaluation - A function that evaluates an applicant's resume against a job description,
 *                          providing a match score and detailed reasoning.
 * - HireResumeEvaluationInput - The input type for the hireResumeEvaluation function.
 * - HireResumeEvaluationOutput - The return type for the hireResumeEvaluation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HireResumeEvaluationInputSchema = z.object({
  resumeText: z.string().describe('The content of the applicant\'s resume.'),
  jobDescriptionText: z.string().describe('The content of the job description.'),
});
export type HireResumeEvaluationInput = z.infer<typeof HireResumeEvaluationInputSchema>;

const HireResumeEvaluationOutputSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe('A match score from 0-100 indicating how well the resume aligns with the job description.'),
  reasoning: z
    .string()
    .describe('Detailed reasoning explaining the match score and how the resume aligns with the job requirements.'),
});
export type HireResumeEvaluationOutput = z.infer<typeof HireResumeEvaluationOutputSchema>;

export async function hireResumeEvaluation(
  input: HireResumeEvaluationInput
): Promise<HireResumeEvaluationOutput> {
  return hireResumeEvaluationFlow(input);
}

const hireResumeEvaluationPrompt = ai.definePrompt({
  name: 'hireResumeEvaluationPrompt',
  input: {schema: HireResumeEvaluationInputSchema},
  output: {schema: HireResumeEvaluationOutputSchema},
  prompt: `You are an expert resume evaluator. Your task is to compare an applicant's resume with a given job description.

First, calculate a match score from 0 to 100, where 100 means a perfect match. The score should reflect the overall alignment of the applicant's skills, experience, and qualifications with the job requirements.

Second, provide detailed reasoning for the match score. Explain what aspects of the resume align well with the job description and what areas could be improved or are missing. Be specific and actionable.

Resume:
---
{{{resumeText}}}
---

Job Description:
---
{{{jobDescriptionText}}}
---
`,
});

const hireResumeEvaluationFlow = ai.defineFlow(
  {
    name: 'hireResumeEvaluationFlow',
    inputSchema: HireResumeEvaluationInputSchema,
    outputSchema: HireResumeEvaluationOutputSchema,
  },
  async input => {
    const {output} = await hireResumeEvaluationPrompt(input);
    return output!;
  }
);

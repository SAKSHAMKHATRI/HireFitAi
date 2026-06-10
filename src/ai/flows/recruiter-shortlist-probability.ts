'use server';
/**
 * @fileOverview An AI agent that simulates a recruiter's qualitative assessment of an applicant.
 *
 * - recruiterShortlistProbability - A function that handles the recruiter's assessment process.
 * - RecruiterShortlistProbabilityInput - The input type for the recruiterShortlistProbability function.
 * - RecruiterShortlistProbabilityOutput - The return type for the recruiterShortlistProbability function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecruiterShortlistProbabilityInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The applicant's resume, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jobDescription: z.string().describe('The job description for which the applicant is applying.'),
});
export type RecruiterShortlistProbabilityInput = z.infer<typeof RecruiterShortlistProbabilityInputSchema>;

const RecruiterShortlistProbabilityOutputSchema = z.object({
  shortlistProbability: z
    .enum(['Very High', 'High', 'Medium', 'Low', 'Very Low'])
    .describe("The recruiter's assessment of the probability that the applicant would be shortlisted for the role."),
  qualitativeAssessment: z
    .string()
    .describe(
      "A qualitative assessment from a recruiter's perspective, highlighting strengths, weaknesses, and key decision factors."
    ),
});
export type RecruiterShortlistProbabilityOutput = z.infer<typeof RecruiterShortlistProbabilityOutputSchema>;

export async function recruiterShortlistProbability(
  input: RecruiterShortlistProbabilityInput
): Promise<RecruiterShortlistProbabilityOutput> {
  return recruiterShortlistProbabilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recruiterShortlistProbabilityPrompt',
  input: {schema: RecruiterShortlistProbabilityInputSchema},
  output: {schema: RecruiterShortlistProbabilityOutputSchema},
  prompt: `You are an experienced professional recruiter. Your task is to evaluate an applicant's resume against a given job description and provide a qualitative assessment, including the probability of them being shortlisted.

**Job Description:**
{{{jobDescription}}}

**Applicant Resume:**
{{media url=resumeDataUri}}

Analyze the resume for keywords, relevant experience, skills, and overall fit with the job description. Provide a candid and professional assessment, as if you were making a hiring decision.

Output your response in JSON format, strictly adhering to the specified output schema.
`,
});

const recruiterShortlistProbabilityFlow = ai.defineFlow(
  {
    name: 'recruiterShortlistProbabilityFlow',
    inputSchema: RecruiterShortlistProbabilityInputSchema,
    outputSchema: RecruiterShortlistProbabilityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

'use server';
/**
 * @fileOverview A Genkit flow for generating tailored cover letters.
 *
 * - generateTailoredCoverLetter - A function that handles the cover letter generation process.
 * - GenerateTailoredCoverLetterInput - The input type for the generateTailoredCoverLetter function.
 * - GenerateTailoredCoverLetterOutput - The return type for the generateTailoredCoverLetter function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTailoredCoverLetterInputSchema = z.object({
  resumeContent: z
    .string()
    .describe("The applicant's resume content in text format."),
  jobDescription: z
    .string()
    .describe('The job description for the position the applicant is applying for.'),
  companyToneOrRequirements: z
    .string()
    .optional()
    .describe(
      'Optional: Specific company tone or additional requirements to consider for the cover letter.'
    ),
});
export type GenerateTailoredCoverLetterInput = z.infer<
  typeof GenerateTailoredCoverLetterInputSchema
>;

const GenerateTailoredCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated tailored cover letter.'),
});
export type GenerateTailoredCoverLetterOutput = z.infer<
  typeof GenerateTailoredCoverLetterOutputSchema
>;

export async function generateTailoredCoverLetter(
  input: GenerateTailoredCoverLetterInput
): Promise<GenerateTailoredCoverLetterOutput> {
  return generateTailoredCoverLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tailoredCoverLetterPrompt',
  input: { schema: GenerateTailoredCoverLetterInputSchema },
  output: { schema: GenerateTailoredCoverLetterOutputSchema },
  prompt: `You are an expert career coach and professional cover letter writer. Your task is to draft a highly personalized and compelling cover letter for a job applicant.
The cover letter should clearly demonstrate how the applicant's skills and experience, as detailed in their resume, align with the requirements and responsibilities outlined in the job description.
Pay close attention to any specific company tone or additional requirements provided.
Ensure the letter is concise, professional, and highlights the applicant's suitability for the role.

Applicant's Resume:
---
{{{resumeContent}}}
---

Job Description:
---
{{{jobDescription}}}
---

{{#if companyToneOrRequirements}}
Company Tone/Specific Requirements:
---
{{{companyToneOrRequirements}}}
---
{{/if}}

Draft the cover letter below, starting directly with the salutation and concluding with a professional closing. Do not include any conversational text outside the letter itself.`,
});

const generateTailoredCoverLetterFlow = ai.defineFlow(
  {
    name: 'generateTailoredCoverLetterFlow',
    inputSchema: GenerateTailoredCoverLetterInputSchema,
    outputSchema: GenerateTailoredCoverLetterOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate cover letter.');
    }
    return output;
  }
);

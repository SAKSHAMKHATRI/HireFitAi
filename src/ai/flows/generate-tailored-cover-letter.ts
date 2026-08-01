'use server';
/**
 * @fileOverview A Genkit flow for generating professional, tailored cover letters grounded only in the
 * provided resume and job description.
 *
 * - generateTailoredCoverLetter - A function that handles the cover letter generation process.
 * - GenerateTailoredCoverLetterInput - The input type for the generateTailoredCoverLetter function.
 * - GenerateTailoredCoverLetterOutput - The return type for the generateTailoredCoverLetter function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTailoredCoverLetterInputSchema = z.object({
  resumeDataUri: z
    .string()
    .optional()
    .describe(
      "The applicant's PDF resume as a data URI (e.g. 'data:application/pdf;base64,...'). Provide this when a PDF resume is available."
    ),
  resumeContent: z
    .string()
    .optional()
    .describe(
      "The applicant's resume content in plain text. Provide this when a PDF data URI is not available."
    ),
  jobDescription: z
    .string()
    .describe('The complete job description for the position the applicant is applying for.'),
  companyName: z
    .string()
    .optional()
    .describe('Optional: the name of the company the applicant is applying to.'),
  hiringManagerName: z
    .string()
    .optional()
    .describe('Optional: the name of the hiring manager or recruiter to address the letter to.'),
  tone: z
    .string()
    .optional()
    .describe(
      'The desired tone of the cover letter: Professional, Confident, Friendly, or Formal. Defaults to Professional.'
    ),
});
export type GenerateTailoredCoverLetterInput = z.infer<
  typeof GenerateTailoredCoverLetterInputSchema
>;

const QualityCheckSchema = z.object({
  greeting: z.boolean().describe('True if the letter includes a proper greeting/salutation.'),
  introduction: z
    .boolean()
    .describe('True if the letter opens with an introduction of the applicant and the role.'),
  fitRationale: z
    .boolean()
    .describe('True if the letter explains why the applicant fits the role and company.'),
  relevantSkills: z
    .boolean()
    .describe('True if the letter highlights relevant skills grounded in the resume.'),
  closing: z
    .boolean()
    .describe('True if the letter has a closing paragraph with a call to action.'),
  signOff: z
    .boolean()
    .describe('True if the letter ends with a professional sign-off (e.g. "Sincerely").'),
});
export type CoverLetterQualityCheck = z.infer<typeof QualityCheckSchema>;

const GenerateTailoredCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated professional cover letter.'),
  qualityCheck: QualityCheckSchema.describe(
    'Self-verification that the letter includes every required structural element.'
  ),
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
  prompt: `You are an expert career coach and professional cover letter writer.

Write a highly personalized, compelling cover letter that clearly shows how the applicant's real skills and experience align with the job description.

ABSOLUTE ACCURACY RULES:
- NEVER fabricate experience, companies, certifications, skills, dates, metrics, achievements, education, or projects.
- Only reference facts that are explicitly present in the applicant's resume.
- If the resume is missing information relevant to the role, do NOT invent it. Instead, phrase the letter to emphasize the applicant's genuine strengths and state naturally (e.g. "my background includes...") rather than inventing specifics.
- If a resume PDF is provided, extract its text first and use only what you find there.
- Do not invent a company name, hiring manager name, or any detail not provided.
- If the hiring manager name is unknown, use a safe generic greeting such as "Dear Hiring Manager," or "Dear [Company] Hiring Team,".

Structure the letter with all of these sections, in order:
1. Greeting (salutation addressing the hiring manager or company).
2. Introduction (the applicant, the role, and the company, if known).
3. Why the candidate fits (role + company fit, grounded in the resume).
4. Relevant skills (specific skills from the resume that match the job description).
5. Closing paragraph (enthusiasm + call to action for an interview).
6. Professional sign-off (e.g. "Sincerely,").

{{#if tone}}
Tone guidance (use {{tone}}):
- Professional: measured, polished, business-appropriate.
- Confident: assertive and self-assured, with concrete evidence.
- Friendly: warm and approachable, while staying professional.
- Formal: traditional, conservative, and highly polished.
{{/if}}

Applicant's Resume (PDF, extract text from it):
{{#if resumeDataUri}}
{{media url=resumeDataUri}}
{{/if}}
{{#if resumeContent}}
Plain-text resume:
---
{{{resumeContent}}}
---
{{/if}}

Job Description:
---
{{{jobDescription}}}
---

{{#if companyName}}
Company Name: {{{companyName}}}
{{/if}}
{{#if hiringManagerName}}
Hiring Manager Name: {{{hiringManagerName}}}
{{/if}}
{{#if tone}}
Tone: {{{tone}}}
{{/if}}

Write the cover letter below, starting directly with the salutation and ending with the professional sign-off. Do not include any conversational text outside the letter itself.

Then set each qualityCheck field to true only if the corresponding section is actually present in the letter you wrote.`,
});

const generateTailoredCoverLetterFlow = ai.defineFlow(
  {
    name: 'generateTailoredCoverLetterFlow',
    inputSchema: GenerateTailoredCoverLetterInputSchema,
    outputSchema: GenerateTailoredCoverLetterOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output || !output.coverLetter.trim()) {
      throw new Error('Failed to generate a cover letter.');
    }
    return output;
  }
);

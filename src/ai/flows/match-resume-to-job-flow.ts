'use server';
/**
 * @fileOverview Compares an uploaded PDF resume against a job description and returns a structured ATS match report.
 *
 * - matchResumeToJob - A function that handles resume-to-job matching.
 * - MatchResumeToJobInput - The input type for matchResumeToJob.
 * - MatchResumeToJobOutput - The return type for matchResumeToJob.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchResumeToJobInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The applicant's PDF resume, as a data URI that includes a MIME type and Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  jobDescription: z.string().min(1).describe('The complete job description to compare against the resume.'),
});
export type MatchResumeToJobInput = z.infer<typeof MatchResumeToJobInputSchema>;

const MatchResumeToJobOutputSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('Overall resume-to-job match score from 0 to 100.'),
  atsCompatibility: z.number().min(0).max(100).describe('ATS compatibility score from 0 to 100 for this job description.'),
  matchedSkills: z.array(z.string()).describe('Skills explicitly present in both the resume and job description.'),
  missingSkills: z.array(z.string()).describe('Skills requested by the job description that are not explicitly present in the resume.'),
  matchedKeywords: z.array(z.string()).describe('Important keywords explicitly present in both the resume and job description.'),
  missingKeywords: z.array(z.string()).describe('Important job description keywords not explicitly present in the resume.'),
  strengths: z.array(z.string()).describe('Strengths supported by explicit overlap between resume and job description.'),
  weaknesses: z.array(z.string()).describe('Weaknesses or gaps based on missing alignment between resume and job description.'),
  recruiterSummary: z.string().describe('A concise recruiter-style compatibility summary grounded only in supplied inputs.'),
  improvementSuggestions: z.array(z.string()).describe('Actionable resume improvements that do not invent facts.'),
  recommendedProjects: z.array(z.string()).describe('Project ideas that could help demonstrate missing job requirements without claiming they already exist.'),
  priorityActions: z.array(z.string()).describe('Highest-priority actions for improving this specific match.'),
});
export type MatchResumeToJobOutput = z.infer<typeof MatchResumeToJobOutputSchema>;

export async function matchResumeToJob(input: MatchResumeToJobInput): Promise<MatchResumeToJobOutput> {
  return matchResumeToJobFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchResumeToJobPrompt',
  input: {schema: MatchResumeToJobInputSchema},
  output: {schema: MatchResumeToJobOutputSchema},
  prompt: `You are HireFit AI, an ATS resume matching engine.

First, extract readable text from the uploaded PDF resume. If the PDF is empty, unreadable, corrupted, image-only without extractable content, or not a resume, return low scores and explain the issue in weaknesses and recruiterSummary.

Then compare the extracted resume content against the complete job description.

Accuracy rules:
- Never fabricate experience, companies, dates, certifications, skills, metrics, achievements, tools, titles, education, or projects.
- Only treat a skill, keyword, strength, or match as present when it is explicitly present in the resume and relevant to the job description.
- Missing skills and missing keywords must come from the job description and must not be claims about the candidate.
- If information is unavailable, state that it is unavailable.
- Suggestions and recommended projects must be framed as future improvements or ways to demonstrate gaps, not as existing experience.
- Do not reward vague similarity when the resume lacks explicit evidence.

Resume PDF:
{{media url=resumeDataUri}}

Job Description:
{{{jobDescription}}}

Return strict structured JSON matching the output schema.`,
});

const matchResumeToJobFlow = ai.defineFlow(
  {
    name: 'matchResumeToJobFlow',
    inputSchema: MatchResumeToJobInputSchema,
    outputSchema: MatchResumeToJobOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Gemini returned an empty match report.');
    }
    return output;
  }
);

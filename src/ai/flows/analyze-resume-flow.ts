'use server';
/**
 * @fileOverview Extracts text from an uploaded resume PDF and returns structured resume analysis.
 *
 * - analyzeResume - A function that handles PDF resume analysis.
 * - AnalyzeResumeInput - The input type for analyzeResume.
 * - AnalyzeResumeOutput - The return type for analyzeResume.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The applicant's PDF resume, as a data URI that includes a MIME type and Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type AnalyzeResumeInput = z.infer<typeof AnalyzeResumeInputSchema>;

const AnalyzeResumeOutputSchema = z.object({
  atsScore: z.number().min(0).max(100).describe('ATS compatibility score from 0 to 100.'),
  resumeSummary: z.string().describe('A concise summary of the resume based only on the uploaded document.'),
  technicalSkills: z.array(z.string()).describe('Technical skills explicitly found in the resume.'),
  softSkills: z.array(z.string()).describe('Soft skills explicitly supported by the resume content.'),
  missingSkills: z.array(z.string()).describe('Likely missing or underrepresented skills based on the resume content.'),
  strengths: z.array(z.string()).describe('Resume strengths grounded only in the uploaded resume.'),
  weaknesses: z.array(z.string()).describe('Resume weaknesses or gaps grounded only in the uploaded resume.'),
  improvementSuggestions: z.array(z.string()).describe('Actionable resume improvement suggestions that do not invent facts.'),
});
export type AnalyzeResumeOutput = z.infer<typeof AnalyzeResumeOutputSchema>;

export async function analyzeResume(input: AnalyzeResumeInput): Promise<AnalyzeResumeOutput> {
  return analyzeResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeResumePrompt',
  input: {schema: AnalyzeResumeInputSchema},
  output: {schema: AnalyzeResumeOutputSchema},
  prompt: `You are HireFit AI, a precise resume analysis system.

First, extract readable text from the uploaded PDF resume. If the PDF is empty, unreadable, image-only without extractable content, corrupted, or not a resume, return a low score and explain the issue in the summary and weaknesses.

Then analyze only the extracted resume content.

Important accuracy rules:
- Do NOT fabricate achievements.
- Do NOT invent experience, employers, education, certifications, tools, metrics, percentages, dates, titles, projects, or skills.
- Base every insight only on evidence present in the uploaded resume.
- If a skill or strength is not clearly supported by the resume text, do not include it.
- Missing skills may be inferred only as resume gaps or underrepresented areas, not as claims about the candidate.
- Suggestions must improve wording, structure, clarity, ATS readability, and evidence presentation without adding unverifiable facts.

Resume PDF:
{{media url=resumeDataUri}}

Return structured JSON that strictly follows the output schema.`,
});

const analyzeResumeFlow = ai.defineFlow(
  {
    name: 'analyzeResumeFlow',
    inputSchema: AnalyzeResumeInputSchema,
    outputSchema: AnalyzeResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Gemini returned an empty resume analysis response.');
    }
    return output;
  }
);

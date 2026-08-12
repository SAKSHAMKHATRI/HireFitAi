'use server';
/**
 * @fileOverview Extracts structured data from an uploaded resume PDF and returns
 * a grounded ATS analysis: overall + section scores, keyword coverage, candidate
 * contact info, and resume sections (education, experience, projects,
 * certifications, achievements). Every field is derived only from the uploaded
 * document — nothing is invented.
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

const CandidateInfoSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe('Candidate full name exactly as written in the resume, or null when absent.'),
  email: z
    .string()
    .nullable()
    .describe('Email address exactly as written in the resume, or null when absent.'),
  phone: z
    .string()
    .nullable()
    .describe('Phone number exactly as written in the resume, or null when absent.'),
  location: z
    .string()
    .nullable()
    .describe('Location (city/country) exactly as written in the resume, or null when absent.'),
  links: z
    .array(z.string())
    .describe('URLs found in the resume (LinkedIn, GitHub, portfolio, website).'),
});

const SectionScoresSchema = z.object({
  technicalSkills: z
    .number()
    .min(0)
    .max(100)
    .describe('Quality and breadth of the technical skills section, 0-100. 0 when absent.'),
  experience: z
    .number()
    .min(0)
    .max(100)
    .describe('Quality of the experience section: roles, impact, and detail, 0-100. 0 when absent.'),
  projects: z
    .number()
    .min(0)
    .max(100)
    .describe('Quality of the projects section, 0-100. 0 when absent.'),
  education: z
    .number()
    .min(0)
    .max(100)
    .describe('Clarity and completeness of the education section, 0-100. 0 when absent.'),
  achievements: z
    .number()
    .min(0)
    .max(100)
    .describe('Presence of measurable, quantified achievements, 0-100. 0 when none are stated.'),
  structure: z
    .number()
    .min(0)
    .max(100)
    .describe('Resume structure: clear headings, consistent ordering, ATS-friendly layout, 0-100.'),
  readability: z
    .number()
    .min(0)
    .max(100)
    .describe('Readability: scannability, bullet usage, concise phrasing, 0-100.'),
});

const EducationItemSchema = z.object({
  institution: z.string().nullable().describe('School or university name, or null when absent.'),
  degree: z.string().nullable().describe('Degree earned (e.g. B.Sc.), or null when absent.'),
  field: z.string().nullable().describe('Field of study, or null when absent.'),
  years: z.string().nullable().describe('Years attended exactly as written, or null when absent.'),
});

const ExperienceItemSchema = z.object({
  title: z.string().nullable().describe('Job title exactly as written, or null when absent.'),
  company: z.string().nullable().describe('Employer name, or null when absent.'),
  period: z.string().nullable().describe('Employment period exactly as written, or null when absent.'),
  summary: z
    .string()
    .nullable()
    .describe('One concise sentence describing the responsibilities actually listed, or null when absent.'),
});

const ProjectItemSchema = z.object({
  name: z.string().nullable().describe('Project name, or null when absent.'),
  description: z
    .string()
    .nullable()
    .describe('One concise sentence describing the project as written, or null when absent.'),
});

const CertificationItemSchema = z.object({
  name: z.string().nullable().describe('Certification name, or null when absent.'),
  issuer: z.string().nullable().describe('Issuing organization, or null when absent.'),
  year: z.string().nullable().describe('Year obtained exactly as written, or null when absent.'),
});

const AnalyzeResumeOutputSchema = z.object({
  atsScore: z.number().min(0).max(100).describe('Overall ATS compatibility score from 0 to 100.'),
  keywordCoverage: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'How thoroughly the resume covers role-relevant keywords and standard ATS terms, 0-100.'
    ),
  candidateInfo: CandidateInfoSchema.optional().describe(
    'Contact and identity details extracted from the resume, only what is present.'
  ),
  sectionScores: SectionScoresSchema.optional().describe(
    'Per-section quality scores, each grounded in the resume content.'
  ),
  education: z
    .array(EducationItemSchema)
    .default([])
    .describe('Education entries exactly as written in the resume.'),
  experience: z
    .array(ExperienceItemSchema)
    .default([])
    .describe('Work experience entries exactly as written in the resume.'),
  projects: z
    .array(ProjectItemSchema)
    .default([])
    .describe('Projects that are actually described in the resume.'),
  certifications: z
    .array(CertificationItemSchema)
    .default([])
    .describe('Certifications listed in the resume.'),
  achievements: z
    .array(z.string())
    .default([])
    .describe('Awards, recognitions, and quantified accomplishments explicitly stated.'),
  missingSections: z
    .array(z.string())
    .default([])
    .describe(
      'Which of the following sections are absent or too weak to evaluate: Experience, Projects, Education, Certifications, Achievements.'
    ),
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

Extraction rules (never invent anything):
- candidateInfo: name, email, phone, location, and links exactly as written. Use null for any contact detail that is absent. Never guess contact details.
- education: institution, degree, field, and years exactly as shown.
- experience: title, company, period, and a one-sentence summary of the described responsibilities.
- projects: only projects that are actually described, with a one-line description.
- certifications: names with issuer and year when shown.
- achievements: awards, recognitions, and quantified accomplishments explicitly stated (percentages, metrics, scale). Never invent numbers.
- missingSections: list which of Experience, Projects, Education, Certifications, Achievements are absent or too weak to evaluate.

Scoring rules (each score 0-100, grounded only in evidence present in the resume):
- atsScore: overall ATS compatibility of the resume.
- keywordCoverage: how thoroughly the resume covers role-relevant keywords and standard ATS terms.
- sectionScores.technicalSkills / experience / projects / education / achievements: quality and evidence for each section; score 0 when that section is absent.
- sectionScores.structure: clear headings, consistent ordering, and ATS-friendly layout.
- sectionScores.readability: scannability, bullet usage, and concise phrasing.

Accuracy rules:
- Do NOT fabricate achievements, experience, employers, education, certifications, tools, metrics, percentages, dates, titles, projects, or skills.
- Base every insight only on evidence present in the uploaded resume.
- If a skill or strength is not clearly supported by the resume text, do not include it.
- Missing skills may be inferred only as resume gaps or underrepresented areas, not as claims about the candidate.
- Suggestions must improve wording, structure, clarity, ATS readability, and evidence presentation without adding unverifiable facts.

Resume PDF:
{{media url=resumeDataUri}}

Return structured JSON that strictly follows the output schema, always including every field.`,
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

'use server';
/**
 * @fileOverview Generates a structured AI career roadmap tailored to a candidate's background and time commitment.
 *
 * - generateCareerRoadmap - A function that generates a career roadmap.
 * - GenerateCareerRoadmapInput - The input type for generateCareerRoadmap.
 * - GenerateCareerRoadmapOutput - The return type for generateCareerRoadmap.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCareerRoadmapInputSchema = z.object({
  currentEducation: z
    .string()
    .describe('The candidate current education, e.g. "B.Tech in Computer Science, 2023".'),
  currentSkills: z
    .string()
    .describe('Comma-separated list of the candidate current skills, tools, and technologies.'),
  experience: z
    .string()
    .describe('The candidate professional experience level: Fresher, Junior, Mid, or Senior.'),
  targetCareer: z
    .string()
    .describe('The target career the candidate wants to transition into, e.g. "AI Engineer".'),
  timeCommitment: z
    .string()
    .describe('The time the candidate can commit to learning: 3 months, 6 months, or 12 months.'),
});
export type GenerateCareerRoadmapInput = z.infer<typeof GenerateCareerRoadmapInputSchema>;

const SkillGapItemSchema = z.object({
  skill: z
    .string()
    .describe('The name of the skill, e.g. "Python", "Machine Learning", "System Design".'),
  currentLevel: z
    .number()
    .min(0)
    .max(100)
    .describe('The candidate current estimated proficiency in this skill (0-100).'),
  requiredLevel: z
    .number()
    .min(0)
    .max(100)
    .describe('The proficiency level required for the target career (0-100).'),
  gap: z
    .string()
    .describe('A one-line description of the gap and what needs to be learned.'),
});
export type SkillGapItem = z.infer<typeof SkillGapItemSchema>;

const WeeklyPlanSchema = z.object({
  week: z.number().describe('The week number this plan entry covers (starting at 1).'),
  focus: z
    .string()
    .describe('The primary topic or skill focus for this week, e.g. "Python fundamentals".'),
  tasks: z
    .array(z.string())
    .min(1)
    .describe('2-4 concrete learning tasks or activities for this week.'),
});
export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;

const MonthlyMilestoneSchema = z.object({
  month: z.number().describe('The month number this milestone belongs to (starting at 1).'),
  title: z.string().describe('A short title for the milestone, e.g. "First end-to-end ML project".'),
  description: z
    .string()
    .describe('What the candidate should be able to do by the end of this month.'),
});
export type MonthlyMilestone = z.infer<typeof MonthlyMilestoneSchema>;

const ProjectSchema = z.object({
  name: z.string().describe('The name of the recommended practice project.'),
  description: z.string().describe('A short description of the project and what it demonstrates.'),
  difficulty: z
    .string()
    .describe('The difficulty of the project: Beginner, Intermediate, or Advanced.'),
});
export type RoadmapProject = z.infer<typeof ProjectSchema>;

const LearningResourceSchema = z.object({
  title: z.string().describe('The title of the course, book, or certification.'),
  provider: z
    .string()
    .describe('The provider or author, e.g. "Coursera", "O\'Reilly", "AWS".'),
});
export type LearningResource = z.infer<typeof LearningResourceSchema>;

const GenerateCareerRoadmapOutputSchema = z.object({
  careerSummary: z
    .string()
    .describe('A 2-3 sentence summary of the transition plan and expected outcome.'),
  currentLevel: z
    .string()
    .describe('The candidate current level relative to the target career, e.g. "Beginner", "Junior".'),
  skillGap: z
    .array(SkillGapItemSchema)
    .min(1)
    .describe('5-8 key skills with current vs required proficiency and the gap.'),
  weeklyRoadmap: z
    .array(WeeklyPlanSchema)
    .min(1)
    .describe(
      'A week-by-week learning plan that fits within the requested time commitment: 12 entries for 3 months, 24 for 6 months, and up to 26 entries for 12 months (consecutive weeks on the same theme may be grouped into one entry, e.g. week 5 covering "Weeks 5-6").'
    ),
  monthlyMilestones: z
    .array(MonthlyMilestoneSchema)
    .min(1)
    .describe('One milestone per month of the time commitment.'),
  projects: z
    .array(ProjectSchema)
    .min(1)
    .describe('3-5 realistic practice projects scaled to the candidate level.'),
  courses: z
    .array(LearningResourceSchema)
    .min(1)
    .describe('Recommended real courses with their providers.'),
  books: z
    .array(LearningResourceSchema)
    .min(1)
    .describe('Recommended real books with their authors.'),
  certifications: z
    .array(LearningResourceSchema)
    .min(1)
    .describe('Recommended real, verifiable certifications with their providers.'),
  interviewPreparation: z
    .array(z.string())
    .min(1)
    .describe('5-7 interview prep focus areas and practice strategies for the target career.'),
  estimatedReadiness: z
    .number()
    .min(0)
    .max(100)
    .describe('Estimated job-readiness percentage after completing this plan.'),
});
export type GenerateCareerRoadmapOutput = z.infer<typeof GenerateCareerRoadmapOutputSchema>;

export async function generateCareerRoadmap(
  input: GenerateCareerRoadmapInput
): Promise<GenerateCareerRoadmapOutput> {
  return generateCareerRoadmapFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCareerRoadmapPrompt',
  input: {schema: GenerateCareerRoadmapInputSchema},
  output: {schema: GenerateCareerRoadmapOutputSchema},
  prompt: `You are HireFit AI, an expert career coach and learning-path architect.

Create a realistic, structured career roadmap that takes the candidate from their current background to the target career within the requested time commitment.

Constraints:
- Be realistic and practical. Never recommend unattainable paths.
- NEVER fabricate certifications. Only recommend real, verifiable certifications that genuinely exist (e.g., AWS Certified, Google Cloud certifications, Microsoft certifications, Coursera certificates, and similar). If unsure whether a certification is real, omit it.
- Only recommend real, well-known courses, books, and providers. Never invent titles or providers.
- Scale the weekly roadmap and milestones to the requested time commitment: 3 months = 12 weekly entries, 6 months = 24 weekly entries, 12 months = up to 26 entries. For 12-month plans you may group consecutive weeks that share a theme into one entry (label the week field with the range, e.g. week: 5 for "Weeks 5-6") so the plan stays complete but compact. Cover the entire time commitment with no gaps.
- Tailor the plan to the candidate's current education, skills, and experience level. A Fresher needs foundational content; a Senior needs advanced, interview-focused content.
- The skill gap list should compare where the candidate is today against what the target career genuinely requires.
- The estimated readiness percentage should reflect how ready the candidate will be for the target career after completing this exact plan.

Candidate Profile:
Current Education: {{{currentEducation}}}
Current Skills: {{{currentSkills}}}
Experience Level: {{{experience}}}
Target Career: {{{targetCareer}}}
Time Commitment: {{{timeCommitment}}}

Return strict structured JSON matching the output schema.`,
});

const generateCareerRoadmapFlow = ai.defineFlow(
  {
    name: 'generateCareerRoadmapFlow',
    inputSchema: GenerateCareerRoadmapInputSchema,
    outputSchema: GenerateCareerRoadmapOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Gemini returned an empty career roadmap.');
    }
    return output;
  }
);

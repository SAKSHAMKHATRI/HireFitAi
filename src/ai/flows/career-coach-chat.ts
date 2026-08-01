'use server';
/**
 * @fileOverview Powers the AI Career Coach chat: a Gemini mentor that answers career questions
 * with conversation history and optional context from other HireFit modules.
 *
 * - careerCoachChat - A function that returns a mentor-style reply.
 * - CareerCoachChatInput - The input type for careerCoachChat.
 * - CareerCoachChatOutput - The return type for careerCoachChat.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']).describe('Who wrote this message.'),
  content: z.string().describe('The full text of the message.'),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ModuleContextSchema = z
  .object({
    resumeAnalysis: z
      .string()
      .optional()
      .describe(
        'Summary of the user resume analysis (strengths, weaknesses, skills, suggestions), if available.'
      ),
    jobMatch: z
      .string()
      .optional()
      .describe(
        'Summary of the user latest job match report (match score, matched/missing skills), if available.'
      ),
    careerRoadmap: z
      .string()
      .optional()
      .describe(
        'Summary of the user career roadmap (target career, skill gaps, milestones, readiness), if available.'
      ),
    interviewFeedback: z
      .string()
      .optional()
      .describe(
        'Summary of the user latest interview feedback (scores, strengths, weaknesses), if available.'
      ),
  })
  .describe(
    'Optional context gathered from the user other HireFit modules. Only include modules that were actually run.'
  );
export type ModuleContext = z.infer<typeof ModuleContextSchema>;

const CareerCoachChatInputSchema = z.object({
  message: z.string().min(1).describe('The user latest career question.'),
  history: z
    .array(ChatMessageSchema)
    .describe('The full conversation history before this message, oldest first.'),
  context: ModuleContextSchema.describe('Optional context from the user other HireFit modules.'),
});
export type CareerCoachChatInput = z.infer<typeof CareerCoachChatInputSchema>;

const CareerCoachChatOutputSchema = z.object({
  reply: z
    .string()
    .describe(
      'The mentor reply in Markdown. Use headings, bold, bullet lists, and code blocks where they genuinely help.'
    ),
});
export type CareerCoachChatOutput = z.infer<typeof CareerCoachChatOutputSchema>;

export async function careerCoachChat(
  input: CareerCoachChatInput
): Promise<CareerCoachChatOutput> {
  return careerCoachChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'careerCoachChatPrompt',
  input: {schema: CareerCoachChatInputSchema},
  output: {schema: CareerCoachChatOutputSchema},
  prompt: `You are HireFit AI Career Coach — a warm, direct, expert career mentor for tech professionals.

The user asks a career question and you answer like a great mentor: honest, practical, specific, and encouraging. Use Markdown (headings, bold, bullets, and code blocks where they help) so the answer is easy to scan.

Grounding rules:
- NEVER fabricate facts about the user. Do not invent their skills, experience, projects, scores, or progress.
- You may only use the context sections below that are marked as available. If a relevant context section is empty or unavailable, say clearly that you do not have that data yet, and suggest which HireFit module would provide it (Resume Analyzer, Job Match, Career Roadmap, or AI Interview).
- If the user asks about something that depends on unavailable context, state what is missing instead of guessing.
- If the question is generic career advice, answer it directly with practical, realistic guidance.

Available user context (only use what is present):
{{#if context.resumeAnalysis}}
Resume Analysis:
{{{context.resumeAnalysis}}}
{{/if}}
{{#if context.jobMatch}}
Job Match:
{{{context.jobMatch}}}
{{/if}}
{{#if context.careerRoadmap}}
Career Roadmap:
{{{context.careerRoadmap}}}
{{/if}}
{{#if context.interviewFeedback}}
Interview Feedback:
{{{context.interviewFeedback}}}
{{/if}}

{{#if history.length}}
Conversation so far:
{{#each history}}
{{{this.role}}}: {{{this.content}}}
{{/each}}
{{/if}}

User question: {{{message}}}

Reply as the mentor now, in Markdown.`,
});

const careerCoachChatFlow = ai.defineFlow(
  {
    name: 'careerCoachChatFlow',
    inputSchema: CareerCoachChatInputSchema,
    outputSchema: CareerCoachChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.reply.trim()) {
      throw new Error('Gemini returned an empty reply.');
    }
    return output;
  }
);

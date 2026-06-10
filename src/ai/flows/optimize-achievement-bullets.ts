'use server';
/**
 * @fileOverview An AI tool to rephrase resume bullet points into strong, results-oriented achievement statements.
 *
 * - optimizeAchievementBullets - A function that handles the optimization of resume bullet points.
 * - OptimizeAchievementBulletsInput - The input type for the optimizeAchievementBullets function.
 * - OptimizeAchievementBulletsOutput - The return type for the optimizeAchievementBullets function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeAchievementBulletsInputSchema = z.object({
  bulletPoints: z
    .array(z.string())
    .describe('An array of resume bullet points to be optimized.'),
});
export type OptimizeAchievementBulletsInput = z.infer<
  typeof OptimizeAchievementBulletsInputSchema
>;

const OptimizeAchievementBulletsOutputSchema = z.object({
  optimizedBulletPoints: z
    .array(z.string())
    .describe('An array of optimized, results-oriented achievement statements.'),
});
export type OptimizeAchievementBulletsOutput = z.infer<
  typeof OptimizeAchievementBulletsOutputSchema
>;

export async function optimizeAchievementBullets(
  input: OptimizeAchievementBulletsInput
): Promise<OptimizeAchievementBulletsOutput> {
  return optimizeAchievementBulletsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeAchievementBulletsPrompt',
  input: {schema: OptimizeAchievementBulletsInputSchema},
  output: {schema: OptimizeAchievementBulletsOutputSchema},
  prompt: `You are an expert resume writer and career coach.
Your task is to transform the provided passive resume bullet points into high-impact, results-driven achievement statements.
Focus on using strong action verbs, quantifying achievements with numbers and metrics, and highlighting the impact or benefit of the action.

Here are the bullet points to optimize:
{{#each bulletPoints}}
- {{{this}}}
{{/each}}

Provide the optimized bullet points in a JSON array format.`,
});

const optimizeAchievementBulletsFlow = ai.defineFlow(
  {
    name: 'optimizeAchievementBulletsFlow',
    inputSchema: OptimizeAchievementBulletsInputSchema,
    outputSchema: OptimizeAchievementBulletsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

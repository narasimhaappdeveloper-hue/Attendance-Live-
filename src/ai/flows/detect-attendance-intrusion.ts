'use server';

/**
 * @fileOverview Flow for detecting attendance intrusion using facial liveness detection and AI-generated enhancement checks.
 *
 * - detectAttendanceIntrusion - A function that handles the attendance intrusion detection process.
 * - DetectAttendanceIntrusionInput - The input type for the detectAttendanceIntrusion function.
 * - DetectAttendanceIntrusionOutput - The return type for the detectAttendanceIntrusion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectAttendanceIntrusionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of the employee, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type DetectAttendanceIntrusionInput = z.infer<typeof DetectAttendanceIntrusionInputSchema>;

const DetectAttendanceIntrusionOutputSchema = z.object({
  isLiveFace: z.boolean().describe('Whether the face in the photo is detected as a live face.'),
  isAiGenerated: z
    .boolean()
    .describe('Whether the face in the photo is detected as AI-generated.'),
  confidence: z.number().describe('The confidence score of the detection.'),
  explanation: z.string().describe('Explanation of the analysis and results.'),
});
export type DetectAttendanceIntrusionOutput = z.infer<typeof DetectAttendanceIntrusionOutputSchema>;

export async function detectAttendanceIntrusion(
  input: DetectAttendanceIntrusionInput
): Promise<DetectAttendanceIntrusionOutput> {
  return detectAttendanceIntrusionFlow(input);
}

const detectAttendanceIntrusionPrompt = ai.definePrompt({
  name: 'detectAttendanceIntrusionPrompt',
  input: {schema: DetectAttendanceIntrusionInputSchema},
  output: {schema: DetectAttendanceIntrusionOutputSchema},
  prompt: `You are an AI expert in detecting fraudulent attendance submissions.

You will analyze the provided photo of the employee and determine if the face is a live face and whether it exhibits characteristics of AI-generated enhancements.

Analyze the following photo:
{{media url=photoDataUri}}

Based on your analysis, set the isLiveFace and isAiGenerated output fields appropriately. Provide a confidence score for your analysis. Explain your reasoning in the explanation field.

Consider factors such as facial movements, texture, lighting, and any anomalies that might indicate manipulation or artificial generation.
`,
});

const detectAttendanceIntrusionFlow = ai.defineFlow(
  {
    name: 'detectAttendanceIntrusionFlow',
    inputSchema: DetectAttendanceIntrusionInputSchema,
    outputSchema: DetectAttendanceIntrusionOutputSchema,
  },
  async input => {
    const {output} = await detectAttendanceIntrusionPrompt(input);
    return output!;
  }
);

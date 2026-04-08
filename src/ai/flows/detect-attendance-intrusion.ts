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

const detectAttendanceIntrusionFlow = ai.defineFlow(
  {
    name: 'detectAttendanceIntrusionFlow',
    inputSchema: DetectAttendanceIntrusionInputSchema,
    outputSchema: DetectAttendanceIntrusionOutputSchema,
  },
  async input => {
    // We use gemini-1.5-flash which is highly stable for image processing.
    // Explicitly passing the full data URI in the media part.
    const {output} = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are an AI expert in detecting fraudulent attendance submissions.
Analyze the provided photo of the employee and determine if the face is a live face (not a photo of a photo, a screen, or a mask) and whether it exhibits characteristics of AI-generated enhancements.
Consider factors such as facial texture, lighting, depth, and any anomalies that might indicate manipulation.`,
      prompt: [
        {text: 'Analyze the following photo for attendance verification:'},
        {
          media: {
            url: input.photoDataUri,
            contentType: 'image/jpeg',
          },
        },
      ],
      output: {schema: DetectAttendanceIntrusionOutputSchema},
    });

    if (!output) {
      throw new Error('AI failed to produce an analysis output.');
    }

    return output;
  }
);
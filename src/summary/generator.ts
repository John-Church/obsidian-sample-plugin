import { OllamaClient } from "../ollama/client";

export interface Summary {
	keyPoints: string[];
	actionItems: string[];
	followUps: string[];
}

export class SummaryGenerator {
	constructor(private ollamaClient: OllamaClient) {}

	async generateSummary(transcript: string): Promise<Summary> {
		const prompt = `
        Analyze the following meeting transcript and provide:
        1. Key points discussed
        2. Action items (tasks that need to be done)
        3. Follow-up items (topics for future discussion)

        Format the response in JSON with the following structure:
        {
            "keyPoints": ["point 1", "point 2", ...],
            "actionItems": ["task 1", "task 2", ...],
            "followUps": ["topic 1", "topic 2", ...]
        }

        Transcript:
        ${transcript}
        `;

		try {
			const response = await this.ollamaClient.generateCompletion(
				"mistral",
				prompt
			);
			return JSON.parse(response);
		} catch (error) {
			console.error("Failed to generate summary:", error);
			throw error;
		}
	}
}

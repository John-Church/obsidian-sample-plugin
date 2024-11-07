export class TranscriptionService {
	private progress: number = 0;
	private API_URL = "https://api.openai.com/v1/audio/transcriptions";
	private API_KEY: string;

	constructor(apiKey: string) {
		this.API_KEY = apiKey;
	}

	async transcribe(audio: Blob): Promise<string> {
		this.progress = 0;
		try {
			// Convert audio blob to File object
			const file = new File([audio], "recording.wav", {
				type: "audio/wav",
			});

			// Create form data
			const formData = new FormData();
			formData.append("file", file);
			formData.append("model", "whisper-1");
			formData.append("language", "en"); // Can be made configurable

			const response = await fetch(this.API_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.API_KEY}`,
				},
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Transcription failed: ${response.statusText}`);
			}

			const data = await response.json();
			this.progress = 100;
			return data.text;
		} catch (error) {
			console.error("Transcription failed:", error);
			throw error;
		}
	}

	getProgress(): number {
		return this.progress;
	}
}

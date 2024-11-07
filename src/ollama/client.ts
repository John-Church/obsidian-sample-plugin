export class OllamaClient {
	constructor(private host: string) {}

	async generateCompletion(model: string, prompt: string): Promise<string> {
		const response = await fetch(`${this.host}/api/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model,
				prompt,
				stream: false,
			}),
		});

		if (!response.ok) {
			throw new Error(`Ollama request failed: ${response.statusText}`);
		}

		const data = await response.json();
		return data.response;
	}

	async transcribe(audioBlob: Blob): Promise<string> {
		// Convert blob to base64
		const base64Audio = await this.blobToBase64(audioBlob);

		const response = await fetch(`${this.host}/api/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "whisper",
				prompt: "Transcribe the following audio:",
				audio: base64Audio,
			}),
		});

		if (!response.ok) {
			throw new Error(`Transcription failed: ${response.statusText}`);
		}

		const data = await response.json();
		return data.response;
	}

	private async blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				if (typeof reader.result === "string") {
					resolve(reader.result.split(",")[1]);
				} else {
					reject(new Error("Failed to convert blob to base64"));
				}
			};
			reader.readAsDataURL(blob);
		});
	}
}

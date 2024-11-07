export class AudioManager {
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	isRecording: boolean = false;

	async startRecording(): Promise<void> {
		console.log("AudioManager: Attempting to start recording...");
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			console.log("AudioManager: Got media stream", stream);

			this.mediaRecorder = new MediaRecorder(stream);
			this.audioChunks = [];

			this.mediaRecorder.addEventListener("dataavailable", (event) => {
				console.log(
					"AudioManager: Received audio chunk",
					event.data.size
				);
				this.audioChunks.push(event.data);
			});

			this.mediaRecorder.addEventListener("start", () => {
				console.log("AudioManager: MediaRecorder started");
				this.isRecording = true;
			});

			this.mediaRecorder.addEventListener("error", (error) => {
				console.error("AudioManager: MediaRecorder error:", error);
				throw error;
			});

			this.mediaRecorder.start(1000); // Collect chunks every second
			console.log("AudioManager: Called start() on MediaRecorder");
		} catch (error) {
			console.error("AudioManager: Failed to start recording:", error);
			throw new Error(`Failed to start recording: ${error.message}`);
		}
	}

	async stopRecording(): Promise<Blob> {
		console.log("AudioManager: Attempting to stop recording...");
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder) {
				const error = new Error("No recording in progress");
				console.error("AudioManager:", error);
				reject(error);
				return;
			}

			this.mediaRecorder.addEventListener("stop", () => {
				console.log("AudioManager: MediaRecorder stopped");
				console.log(
					"AudioManager: Number of chunks:",
					this.audioChunks.length
				);

				const audioBlob = new Blob(this.audioChunks, {
					type: "audio/wav",
				});
				console.log(
					"AudioManager: Created final blob, size:",
					audioBlob.size
				);

				this.isRecording = false;
				this.audioChunks = [];

				// Stop all tracks in the stream
				const tracks = this.mediaRecorder?.stream.getTracks();
				tracks?.forEach((track) => {
					console.log("AudioManager: Stopping track:", track.kind);
					track.stop();
				});

				resolve(audioBlob);
			});

			this.mediaRecorder.stop();
		});
	}

	getRecordingState(): string {
		return this.mediaRecorder ? this.mediaRecorder.state : "inactive";
	}
}

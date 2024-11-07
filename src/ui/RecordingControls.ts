import { MeetingNotesPlugin } from "../types";

export class RecordingControls {
	private statusBarItem: HTMLElement;
	private recordingTimer: number = 0;
	private timerInterval: NodeJS.Timeout | null = null;

	constructor(private plugin: MeetingNotesPlugin) {
		this.statusBarItem = plugin.addStatusBarItem();
		this.updateStatus("Ready");
	}

	private updateStatus(status: string, time?: string) {
		const displayText = time ? `${status} (${time})` : status;
		this.statusBarItem.setText(displayText);
	}

	private formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	}

	startRecording() {
		this.recordingTimer = 0;
		this.updateStatus("Recording", "0:00");

		this.timerInterval = setInterval(() => {
			this.recordingTimer++;
			this.updateStatus(
				"Recording",
				this.formatTime(this.recordingTimer)
			);
		}, 1000);
	}

	async stopRecording() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}

		this.updateStatus("Processing...");
		// The actual processing will be handled by the main plugin
	}

	setProcessingStatus(status: string) {
		this.updateStatus(status);
	}

	reset() {
		this.updateStatus("Ready");
	}
}

import { Modal, App, ButtonComponent, Notice } from "obsidian";
import { MeetingNotesPlugin } from "../types";

export class RecordingModal extends Modal {
	private isRecording = false;
	private recordButton: ButtonComponent;
	private statusEl: HTMLElement;

	constructor(app: App, private plugin: MeetingNotesPlugin) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Meeting Recording" });

		this.statusEl = contentEl.createEl("div", {
			text: "Ready to record",
			cls: "recording-status",
		});

		const controlsContainer = contentEl.createDiv("recording-controls");

		this.recordButton = new ButtonComponent(controlsContainer)
			.setButtonText(
				this.isRecording ? "Stop Recording" : "Start Recording"
			)
			.setCta()
			.onClick(async () => {
				try {
					if (this.isRecording) {
						await this.stopRecording();
					} else {
						await this.startRecording();
					}
				} catch (error) {
					console.error("Recording action failed:", error);
					new Notice(`Recording error: ${error.message}`);
					this.updateStatus("Error: " + error.message, "error");
				}
			});

		const cancelButton = new ButtonComponent(controlsContainer)
			.setButtonText("Cancel")
			.onClick(() => {
				if (this.isRecording) {
					new Notice("Please stop recording first");
					return;
				}
				this.close();
			});

		if (this.isRecording) {
			controlsContainer.addClass("is-recording");
		}
	}

	private async startRecording() {
		try {
			this.updateStatus("Starting recording...", "processing");
			await this.plugin.startRecording();
			this.isRecording = true;
			this.updateRecordButton();
			this.updateStatus("Recording in progress", "recording");
			this.contentEl
				.querySelector(".recording-controls")
				?.addClass("is-recording");
		} catch (error) {
			this.isRecording = false;
			this.updateRecordButton();
			this.updateStatus("Error: " + error.message, "error");
			throw error;
		}
	}

	private async stopRecording() {
		try {
			this.updateStatus("Stopping recording...", "processing");
			await this.plugin.stopRecording();

			// Show info message
			this.updateStatus(
				"Processing will continue in background",
				"success"
			);
			new Notice(
				"Processing will continue in background. Check status bar for progress.",
				5000
			);

			// Close modal after a short delay
			setTimeout(() => {
				this.close();
			}, 2000);
		} catch (error) {
			this.updateStatus("Error stopping recording", "error");
			throw error;
		}
	}

	// Add a new method to handle progress updates
	public updateProgress(step: string) {
		const progressEl = this.contentEl.querySelector(".progress-container");
		if (progressEl) {
			progressEl.empty();
			progressEl.createEl("div", {
				text: step,
				cls: "progress-step",
			});
			progressEl.createEl("div", {
				cls: "progress-spinner",
			});
		}
	}

	private updateRecordButton() {
		this.recordButton
			.setButtonText(
				this.isRecording ? "Stop Recording" : "Start Recording"
			)
			.setCta();

		if (this.isRecording) {
			this.recordButton.buttonEl.addClass("is-recording");
		} else {
			this.recordButton.buttonEl.removeClass("is-recording");
		}
	}

	private updateStatus(
		message: string,
		type:
			| "ready"
			| "recording"
			| "processing"
			| "success"
			| "error" = "ready"
	) {
		if (!this.statusEl) return;

		this.statusEl.setText(message);

		// Remove all possible status classes
		this.statusEl.removeClass(
			"recording",
			"processing",
			"success",
			"error"
		);

		// Add the appropriate class
		switch (type) {
			case "recording":
				this.statusEl.addClass("recording");
				break;
			case "processing":
				this.statusEl.addClass("processing");
				break;
			case "success":
				this.statusEl.addClass("success");
				break;
			case "error":
				this.statusEl.addClass("error");
				break;
			// 'ready' doesn't need a special class
		}
	}

	onClose() {
		if (this.isRecording) {
			this.stopRecording().catch(console.error);
		}
		const { contentEl } = this;
		contentEl.empty();
	}
}

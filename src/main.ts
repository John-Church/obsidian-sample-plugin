import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
	Notice,
} from "obsidian";
import { AudioManager } from "./audio/manager";
import { TranscriptionService } from "./transcription/service";
import { OllamaClient } from "./ollama/client";
import { SummaryGenerator, Summary } from "./summary/generator";
import { RecordingControls } from "./ui/RecordingControls";
import { RecordingModal } from "./ui/RecordingModal";

interface MeetingNotesSettings {
	ollamaHost: string;
	openaiApiKey: string;
	summaryModel: string;
	templatePath: string;
}

const DEFAULT_SETTINGS: MeetingNotesSettings = {
	ollamaHost: "http://localhost:11434",
	openaiApiKey: "",
	summaryModel: "mistral",
	templatePath: "",
};

export default class MeetingNotesPlugin extends Plugin {
	settings: MeetingNotesSettings;
	audioManager: AudioManager;
	transcriptionService: TranscriptionService;
	ollamaClient: OllamaClient;
	summaryGenerator: SummaryGenerator;
	recordingControls: RecordingControls;
	activeModal: RecordingModal | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize core services
		this.ollamaClient = new OllamaClient(this.settings.ollamaHost);
		this.audioManager = new AudioManager();
		this.transcriptionService = new TranscriptionService(
			this.settings.openaiApiKey
		);
		this.summaryGenerator = new SummaryGenerator(this.ollamaClient);

		// Add ribbon icon for quick access
		this.addRibbonIcon("microphone", "Start Meeting Recording", () => {
			this.activeModal = new RecordingModal(this.app, this);
			this.activeModal.open();
		});

		// Add settings tab
		this.addSettingTab(new MeetingNotesSettingTab(this.app, this));

		// Add recording controls
		this.recordingControls = new RecordingControls(this);
	}

	async startRecording() {
		if (!this.settings.openaiApiKey) {
			throw new Error("Please set your OpenAI API key in settings first");
		}

		console.log("Plugin: Starting recording...");
		try {
			await this.audioManager.startRecording();
			this.recordingControls.startRecording();
			console.log("Plugin: Recording started successfully");
		} catch (error) {
			console.error("Plugin: Failed to start recording:", error);
			this.recordingControls.reset();
			throw error;
		}
	}

	async stopRecording() {
		console.log("Plugin: Stopping recording...");
		try {
			this.recordingControls.setProcessingStatus(
				"Processing recording..."
			);
			const audioBlob = await this.audioManager.stopRecording();
			console.log("Plugin: Got audio blob, size:", audioBlob.size);

			// Start background processing
			this.processInBackground(audioBlob).catch(console.error);

			// Return immediately so the modal can close
			return;
		} catch (error) {
			console.error("Plugin: Failed to stop recording:", error);
			this.recordingControls.reset();
			throw error;
		}
	}

	private async saveTranscriptOnly(
		transcript: string,
		date: Date = new Date()
	) {
		const month = date.toLocaleString("default", { month: "long" });
		const day = date.getDate().toString().padStart(2, "0");
		const time = date
			.toLocaleTimeString("default", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			})
			.replace(":", "");

		const folderPath = `Meetings/${month}`;

		try {
			// Ensure folders exist
			const meetingsFolder =
				this.app.vault.getAbstractFileByPath("Meetings");
			if (!meetingsFolder) {
				await this.app.vault.createFolder("Meetings");
			}

			const monthFolder =
				this.app.vault.getAbstractFileByPath(folderPath);
			if (!monthFolder) {
				await this.app.vault.createFolder(folderPath);
			}

			const fileName = `${folderPath}/${day}-${time}-transcript.md`;
			const content = `# Meeting Transcript - ${date.toLocaleString()}

> [!warning] AI Processing Incomplete
> This file contains only the transcript. AI processing failed or was interrupted.

## Transcript
${transcript}`;

			const file = await this.app.vault.create(fileName, content);
			return file;
		} catch (error) {
			console.error("Failed to save transcript:", error);
			throw error;
		}
	}

	async processInBackground(audioBlob: Blob) {
		// Create a status notice that we'll update
		const statusNotice = new Notice("Starting transcription...", 0);

		try {
			// First, get the transcript
			statusNotice.setMessage(
				"Transcribing audio... (this may take a while)"
			);
			const transcript = await this.transcriptionService.transcribe(
				audioBlob
			);

			// Save transcript immediately
			const file = await this.saveTranscriptOnly(transcript);
			statusNotice.setMessage("Transcript saved! Generating summary...");

			try {
				// Try AI processing
				const summary = await this.summaryGenerator.generateSummary(
					transcript
				);

				// If successful, create the full note
				await this.createMeetingNote(transcript, summary);

				// Delete the transcript-only file
				await this.app.vault.delete(file);

				statusNotice.hide();
				new Notice("Meeting notes created successfully!");
			} catch (aiError) {
				console.error("AI processing failed:", aiError);
				statusNotice.hide();
				new Notice(
					"AI processing failed, but transcript was saved!",
					5000
				);
			}
		} catch (error) {
			console.error("Transcription failed:", error);
			statusNotice.hide();
			new Notice("Failed to transcribe audio: " + error.message, 5000);
			throw error;
		}
	}

	private async createMeetingNote(transcript: string, summary: Summary) {
		// Create folder structure
		const date = new Date();
		const month = date.toLocaleString("default", { month: "long" });
		const day = date.getDate().toString().padStart(2, "0");
		const time = date
			.toLocaleTimeString("default", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			})
			.replace(":", "");

		// Create the folder path
		const folderPath = `Meetings/${month}`;

		try {
			// Check if folders exist and create them if they don't
			const meetingsFolder =
				this.app.vault.getAbstractFileByPath("Meetings");
			if (!meetingsFolder) {
				await this.app.vault.createFolder("Meetings");
			}

			const monthFolder =
				this.app.vault.getAbstractFileByPath(folderPath);
			if (!monthFolder) {
				await this.app.vault.createFolder(folderPath);
			}

			// Create the file
			const fileName = `${folderPath}/${day}-${time}.md`;
			const content = `# Meeting Notes - ${date.toLocaleString()}

## Summary
${summary.keyPoints.map((point: string) => `- ${point}`).join("\n")}

## Action Items
${summary.actionItems.map((item: string) => `- [ ] ${item}`).join("\n")}

## Follow-ups
${summary.followUps.map((item: string) => `- ${item}`).join("\n")}

## Full Transcript
${transcript}`;

			const file = await this.app.vault.create(fileName, content);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);

			return file;
		} catch (error) {
			console.error("Failed to create meeting note:", error);
			throw error;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MeetingNotesSettingTab extends PluginSettingTab {
	plugin: MeetingNotesPlugin;

	constructor(app: App, plugin: MeetingNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("OpenAI API Key")
			.setDesc("Your OpenAI API key for Whisper transcription")
			.addText((text) =>
				text
					.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Ollama Host")
			.setDesc("The URL of your Ollama instance")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:11434")
					.setValue(this.plugin.settings.ollamaHost)
					.onChange(async (value) => {
						this.plugin.settings.ollamaHost = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Summary Model")
			.setDesc("The Ollama model to use for summary generation")
			.addText((text) =>
				text
					.setPlaceholder("mistral")
					.setValue(this.plugin.settings.summaryModel)
					.onChange(async (value) => {
						this.plugin.settings.summaryModel = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

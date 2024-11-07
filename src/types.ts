import { Plugin } from "obsidian";

export interface MeetingNotesPlugin extends Plugin {
	startRecording(): Promise<void>;
	stopRecording(): Promise<void>;
	addStatusBarItem(): HTMLElement;
}

export interface MeetingNotesSettings {
	ollamaHost: string;
	openaiApiKey: string;
	summaryModel: string;
	templatePath: string;
}

export const DEFAULT_SETTINGS: MeetingNotesSettings = {
	ollamaHost: "http://localhost:11434",
	openaiApiKey: "",
	summaryModel: "mistral",
	templatePath: "",
};

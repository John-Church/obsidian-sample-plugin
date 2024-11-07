import { MeetingNotesPlugin } from "../types";

export class StatusBar {
	private statusBarItem: HTMLElement;
	private currentProcess: string | null = null;

	constructor(private plugin: MeetingNotesPlugin) {
		this.statusBarItem = plugin.addStatusBarItem();
		this.statusBarItem.addClass("meeting-notes-status");
		this.reset();
	}

	setProcess(process: string) {
		this.currentProcess = process;
		this.statusBarItem.setText(`📝 ${process}`);
		this.statusBarItem.addClass("processing");
	}

	reset() {
		this.currentProcess = null;
		this.statusBarItem.setText("");
		this.statusBarItem.removeClass("processing");
	}

	getCurrentProcess(): string | null {
		return this.currentProcess;
	}
}

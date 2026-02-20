export type Theme = "night" | "navy" | "day" | "auto";
export type Accent = "gold" | "teal";

export interface Slide {
	title: string;
	blocks: Block[];
}

export type Block = LineBlock | ClickBlock | PauseBlock | NoteBlock;

export interface LineBlock {
	type: "line";
	html: string;
}

export interface ClickBlock {
	type: "click";
}

export interface PauseBlock {
	type: "pause";
	note?: string;
}

export interface NoteBlock {
	type: "note";
	text: string;
}

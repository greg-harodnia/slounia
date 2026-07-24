export interface Importance {
	id: number | null;
	name: string | null;
	level: number | null;
}

export interface Translation {
	id: number;
	translation: string;
	comment: string | null;
	likes: number;
}

export function parseCrossref(translation: string) {
	return translation.match(/^(гл|параўн)\.\s+(.+)$/iu);
}

export interface WordData {
	id: string;
	importance: Importance;
	comment: string | null;
	likes: number;
	hidden: boolean;
	is_pinned: boolean;
	created_at: string | null;
	translations: Translation[];
	tags: string[];
}

export interface TagData {
	id: number;
	name: string;
}

export type Crumb = { label?: string; href?: string; onclick?: () => void };

export interface Post {
	id: number;
	slug: string;
	title: string;
	content: string;
	hashtags: string[];
	is_pinned: boolean;
	likes: number;
	published_at: string;
	created_at: string;
	updated_at: string;
}

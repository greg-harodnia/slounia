import { resolve } from '$app/paths';

export const PAGE_SIZE = 20;
export const DEFAULT_SORT = import.meta.env.PROD ? 'word' : 'created_at';
export const DEFAULT_ORDER = import.meta.env.PROD ? 'asc' : 'desc';
export const CACHE_TTL = 900; // 15 minutes, in seconds
export const CACHE_TTL_LONG = 604800; // 7 days, in seconds

export function r(path: string): string {
	// @ts-expect-error - dynamic path, not literal route
	return resolve(path);
}

export const SITE_URL = 'https://slounia.vercel.app';
export const SITE_NAME = 'Слоўня — слоўнік жывой мовы';
export const SITE_DESCRIPTION = 'Слоўнік з пошукам і перакладамі калек і наватвораў на жывую беларускую мову.';

const months = [
	'студзеня',
	'лютага',
	'сакавіка',
	'красавіка',
	'траўня',
	'чэрвеня',
	'ліпеня',
	'жніўня',
	'верасьня',
	'кастрычніка',
	'лістапада',
	'сьнежня',
];

export function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export const importanceLevels = [
	{ id: 8, name: 'Сынонімы' },
	{ id: 7, name: 'Трасянка' },
	{ id: 6, name: 'Уважліва' },
	{ id: 1, name: 'Можна лепей' },
	{ id: 2, name: 'Нязграба' },
	{ id: 3, name: 'Недарэка' },
	{ id: 4, name: 'Жах' },
	{ id: 5, name: '💀' },
];

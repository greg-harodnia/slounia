import { resolve } from '$app/paths';

export const PAGE_SIZE = 20;

export function r(path: string): string {
	// @ts-expect-error - dynamic path, not literal route
	return resolve(path);
}

export const SITE_URL = 'https://slounia.vercel.app';
export const SITE_NAME = 'Слоўня — слоўнік жывой мовы';
export const SITE_DESCRIPTION =
	'Слоўнік з пошукам і перакладамі калек (наркамаўка) на чыстую беларускую мову (тарашкевіца). Антыкалька.';

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
	{ id: 1, name: 'Можна лепей' },
	{ id: 2, name: 'Нязграба' },
	{ id: 3, name: 'Недарэка' },
	{ id: 4, name: 'Жах' },
	{ id: 5, name: '💀' },
];

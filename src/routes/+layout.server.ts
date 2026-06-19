import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		banned: locals.banned ?? false,
		banReason: locals.banReason ?? null,
	};
};

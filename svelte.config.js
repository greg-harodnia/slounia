import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
	},
	kit: {
		// Pinned adapter (not adapter-auto) so the deploy uses the exact adapter
		// + @vercel/nft version resolved in bun.lock. adapter-auto installs
		// adapter-vercel at build time on Vercel, which pulled a broken
		// @vercel/nft and broke pushes (manual redeploys worked only via cache).
		adapter: adapter({ runtime: 'nodejs22.x' }),
	},
};

export default config;

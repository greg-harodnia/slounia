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
		adapter: adapter({ runtime: 'nodejs24.x' }),
		// Lazy-loaded overlay components (word/blog/suggest/modals) each emit
		// their own CSS chunk, and SvelteKit links every one of them in the
		// initial HTML as a render-blocking stylesheet. Inlining the small ones
		// turns those ~14 blocking network requests into one <style> block. The
		// threshold also covers the layout + homepage CSS (the last blocking
		// requests), so the initial render waits on zero stylesheet fetches. The
		// HTML is CDN-cached with stale-while-revalidate, so the extra ~24 KB
		// of inlined CSS is served from the edge, not re-fetched.
		inlineStyleThreshold: 16000,
	},
};

export default config;

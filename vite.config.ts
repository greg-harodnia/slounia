import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			workbox: {
				clientsClaim: true,
				cleanupOutdatedCaches: true,
				// The plugin defaults navigateFallback to 'index.html', but a
				// SvelteKit SSR build has no such file, so the generated
				// NavigationRoute would throw non-precached-url and prevent the
				// service worker from ever installing. Navigations are SSR'd
				// anyway; only static assets are precached.
				navigateFallback: undefined,
			},
			includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
			manifest: {
				name: 'Слоўня — слоўнік жывой мовы',
				short_name: 'Слоўня',
				description: 'Пошук і прагляд слоў з перакладамі на чыстую мову',
				theme_color: '#f5f7fa',
				background_color: '#f5f7fa',
				display: 'standalone',
				display_override: ['standalone', 'minimal-ui'],
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable',
					},
				],
			},
		}),
	],
});

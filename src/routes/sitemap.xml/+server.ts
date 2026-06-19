import { supabase } from '$lib/server/db';
import { SITE_URL } from '$lib/constants';

export async function GET() {
	let posts: Array<{ slug: string; updated_at: string | null; published_at: string | null }> = [];
	let words: Array<{ id: string; created_at: string | null }> = [];

	try {
		const [postsRes, wordsRes] = await Promise.all([
			supabase.from('posts').select('slug, updated_at, published_at').order('published_at', { ascending: false }),
			supabase.from('words').select('id, created_at').order('id'),
		]);
		if (postsRes.data) posts = postsRes.data;
		if (wordsRes.data) words = wordsRes.data;
	} catch {
		// proceed with whatever we have
	}

	const pages: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [
		{ loc: SITE_URL, priority: '1.0', changefreq: 'daily' },
		{ loc: `${SITE_URL}/blog`, priority: '0.8', changefreq: 'weekly' },
	];

	for (const word of words) {
		pages.push({
			loc: `${SITE_URL}/word/${encodeURIComponent(word.id)}`,
			priority: '0.5',
			changefreq: 'monthly',
			lastmod: word.created_at ?? undefined,
		});
	}

	for (const post of posts) {
		pages.push({
			loc: `${SITE_URL}/blog/${post.slug}`,
			priority: '0.7',
			changefreq: 'monthly',
			lastmod: post.updated_at || post.published_at || undefined,
		});
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `	<url>
		<loc>${p.loc}</loc>
		<priority>${p.priority}</priority>
		<changefreq>${p.changefreq}</changefreq>
		${p.lastmod ? `<lastmod>${new Date(p.lastmod).toISOString()}</lastmod>` : ''}
	</url>`,
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=86400',
		},
	});
}

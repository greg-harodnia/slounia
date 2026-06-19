<script lang="ts">
	import { onMount } from 'svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';

	let { slug, likes: initialLikes }: { slug: string; likes: number } = $props();

	let likedPosts = $state<Record<string, boolean>>({});
	/* svelte-ignore state_referenced_locally */
	let currentLikes = $state(initialLikes);

	onMount(() => {
		try {
			const stored = localStorage.getItem('liked_posts');
			if (stored) likedPosts = JSON.parse(stored);
		} catch {
			// localStorage unavailable
		}
	});

	function save() {
		localStorage.setItem('liked_posts', JSON.stringify(likedPosts));
	}

	async function toggleLike() {
		const liked = !!likedPosts[slug];
		const prevLiked = likedPosts;
		const prevLikes = currentLikes;

		if (liked) {
			const { [slug]: _, ...rest } = likedPosts;
			likedPosts = rest;
			currentLikes = Math.max(currentLikes - 1, 0);
		} else {
			likedPosts = { ...likedPosts, [slug]: true };
			currentLikes += 1;
		}
		save();

		try {
			const res = await fetch(`/api/blog/${slug}/like`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ like: !liked }),
			});
			if (res.ok) {
				const data = await res.json();
				currentLikes = data.likes;
			} else {
				throw new Error('Server error');
			}
		} catch {
			// rollback on failure
			likedPosts = prevLiked;
			currentLikes = prevLikes;
			save();
		}
	}
</script>

<LikeButton liked={!!likedPosts[slug]} count={currentLikes} onclick={toggleLike} label="Like post" post />

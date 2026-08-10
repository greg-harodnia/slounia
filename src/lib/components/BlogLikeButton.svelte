<script lang="ts">
	import LikeButton from '$lib/components/LikeButton.svelte';
	import { userStore } from '$lib/stores/userStore.svelte';

	let { slug, likes: initialLikes }: { slug: string; likes: number } = $props();

	function toggleLike() {
		userStore.togglePostLike(slug, initialLikes);
	}
</script>

<LikeButton
	liked={userStore.isPostLiked(slug)}
	count={userStore.getPostLikeCount(slug, initialLikes)}
	onclick={toggleLike}
	label="Like post"
	large
/>

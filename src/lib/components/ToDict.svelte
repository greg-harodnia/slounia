<script lang="ts">
	import { r } from '$lib/constants';
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a class="to-dict" href={r('/')}>Да слоўніка</a>

<style>
	.to-dict {
		flex-shrink: 0;
		color: var(--c-primary);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}
	.to-dict:hover {
		text-decoration: underline;
	}
</style>

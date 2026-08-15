<script lang="ts">
	import type { Crumb } from '$lib/types';
	import OverlayShell from '$lib/components/OverlayShell.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import SuggestView from '$lib/components/SuggestView.svelte';

	let {
		onclose,
		userToken = '',
		devMode = false,
	}: { onclose: () => void; userToken?: string; devMode?: boolean } = $props();

	let breadcrumbs = $derived([{ label: 'Галоўная', onclick: onclose }, { label: 'Запрапанаваць слова' }] as Crumb[]);
</script>

{#snippet header()}
	<Breadcrumb items={breadcrumbs} />
{/snippet}

<OverlayShell {header} {onclose}>
	<SuggestView {userToken} {devMode} />
</OverlayShell>

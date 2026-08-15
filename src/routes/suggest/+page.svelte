<script lang="ts">
	import { onMount } from 'svelte';
	import { SITE_URL, SITE_NAME } from '$lib/constants';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import ToDict from '$lib/components/ToDict.svelte';
	import SuggestView from '$lib/components/SuggestView.svelte';
	import { userStore } from '$lib/stores/userStore.svelte';

	let devMode = $state(false);

	onMount(() => {
		devMode = !import.meta.env.PROD && localStorage.getItem('dev_mode') === 'true';
	});
</script>

<svelte:head>
	<title>Запрапанаваць слова — {SITE_NAME}</title>
	<meta name="description" content="Запрапануйце новае слова і пераклад для слоўніка {SITE_NAME.toLowerCase()}." />
	<meta property="og:title" content="Запрапанаваць слова — {SITE_NAME}" />
	<meta property="og:description" content="Запрапануйце новае слова і пераклад для слоўніка." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{SITE_URL}/suggest" />
	<meta property="og:image" content="{SITE_URL}/pwa-512x512.png" />
	<meta name="twitter:title" content="Запрапанаваць слова — {SITE_NAME}" />
	<meta name="twitter:description" content="Запрапануйце новае слова і пераклад для слоўніка." />
	<meta name="twitter:image" content="{SITE_URL}/pwa-512x512.png" />
</svelte:head>

<div class="page-wrapper page-full">
	<div class="breadcrumb-wrap">
		<Breadcrumb items={[{ href: '/' }, { label: 'Запрапанаваць слова' }]} />
		<ToDict />
	</div>
	<div class="page-scroll">
		<SuggestView userToken={userStore.userToken} {devMode} />
	</div>
</div>

<style>
	.page-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: none;
	}
	.page-scroll::-webkit-scrollbar {
		display: none;
	}
</style>

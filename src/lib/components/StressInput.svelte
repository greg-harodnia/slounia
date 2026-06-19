<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		name = '',
		class: className = '',
		multiline = false,
	}: {
		value: string;
		placeholder?: string;
		name?: string;
		class?: string;
		multiline?: boolean;
	} = $props();

	let inputEl = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);

	export function focus() {
		inputEl?.focus();
	}
</script>

{#if multiline}
	<textarea bind:value bind:this={inputEl} {placeholder} {name} class={className} rows="2"></textarea>
{:else}
	<input type="text" bind:value bind:this={inputEl} {placeholder} {name} class={className} />
{/if}

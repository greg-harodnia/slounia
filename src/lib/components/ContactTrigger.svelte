<script lang="ts">
	import EasterEgg from './EasterEgg.svelte';
	import { onMount } from 'svelte';
	import { contact } from '$lib/stores/contact.svelte';

	let {
		userToken = '',
		open = false,
		onOpen,
	}: {
		userToken?: string;
		open?: boolean;
		onOpen: (view: 'form' | 'my_messages') => void;
	} = $props();

	onMount(() => {
		if (userToken) contact.fetchMyMessages(userToken);
	});
</script>

<div class="contact-links">
	<button class="contact-link" onclick={() => onOpen('form')}>Напісаць творцу</button>
	<EasterEgg />
</div>

{#if !open && contact.unreadReplies > 0 && !contact.dismissedPopup}
	<div class="reply-popup">
		<div class="reply-popup-body">
			<strong>📩 Новы адказ</strong>
			<p>{contact.myMessages[0]?.reply}</p>
		</div>
		<div class="reply-popup-actions">
			<button
				class="reply-popup-btn"
				onclick={() => {
					contact.markRepliesRead();
					contact.dismissedPopup = true;
					onOpen('my_messages');
				}}
			>
				Паглядзець
			</button>
			<button
				class="reply-popup-close"
				onclick={() => {
					contact.markRepliesRead();
					contact.dismissedPopup = true;
				}}>×</button
			>
		</div>
	</div>
{/if}

<style>
	.contact-links {
		display: flex;
		gap: 1rem;
	}

	.contact-link {
		background: none;
		border: none;
		color: var(--c-text-muted);
		font-size: inherit;
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s;
	}
	.contact-link:hover {
		color: var(--c-primary);
	}

	.reply-popup {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 200;
		background: var(--c-surface);
		border: 1.5px solid var(--c-primary);
		border-radius: var(--radius);
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
		width: 320px;
		max-width: calc(100vw - 2rem);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: popup-in 0.3s ease-out;
	}
	@keyframes popup-in {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.reply-popup-body {
		padding: 1rem 1rem 0.5rem;
	}
	.reply-popup-body strong {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.3rem;
	}
	.reply-popup-body p {
		font-size: 0.9rem;
		margin: 0;
		color: var(--c-text);
		word-wrap: break-word;
	}
	.reply-popup-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem 0.75rem;
		gap: 0.5rem;
	}
	.reply-popup-btn {
		padding: 0.4rem 1rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.reply-popup-btn:hover {
		opacity: 0.85;
	}
	.reply-popup-close {
		background: none;
		border: none;
		font-size: 1.3rem;
		cursor: pointer;
		color: var(--c-text-muted);
		padding: 0.1rem 0.3rem;
		line-height: 1;
		font-family: inherit;
	}
	.reply-popup-close:hover {
		color: var(--c-text);
	}
</style>

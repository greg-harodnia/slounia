<script lang="ts">
	import Modal from './Modal.svelte';
	import EasterEgg from './EasterEgg.svelte';

	let { userToken = '', devMode = false }: { userToken?: string; devMode?: boolean } = $props();

	type View = 'form' | 'my_messages' | 'admin' | 'bans';

	let open = $state(false);
	let view = $state<View>('form');
	let name = $state('');
	let telegram = $state('');
	let message = $state('');
	let submitting = $state(false);
	let error = $state('');
	let done = $state(false);

	let myMessages = $state<any[]>([]);
	let unreadReplies = $state(0);
	let lastSeenReplyId = $state(0);

	let adminMessages = $state<any[]>([]);
	let replyDraft = $state<Record<number, string>>({});
	let replyLoading = $state<Record<number, boolean>>({});

	let bannedList = $state<any[]>([]);
	let banLoading = $state(false);
	let banMsg = $state('');
	let banEditDraft = $state<Record<number, string>>({});

	let bannedLookup = $derived.by(() => {
		const map: Record<string, any> = {};
		for (const ban of bannedList) {
			if (ban.user_token) map[ban.user_token] = ban;
		}
		return map;
	});

	let dismissedPopup = $state(false);

	$effect(() => {
		if (userToken) fetchMyMessages();
	});

	function resetForm() {
		name = '';
		telegram = '';
		message = '';
		error = '';
		done = false;
	}

	async function fetchMyMessages() {
		if (!userToken) return;
		lastSeenReplyId = Number(localStorage.getItem('last_seen_reply_id') || '0');
		try {
			const res = await fetch(`/api/messages?token=${encodeURIComponent(userToken)}`);
			if (res.ok) {
				myMessages = await res.json();
				unreadReplies = myMessages.filter((m) => m.id > lastSeenReplyId).length;
			}
		} catch (e) {
			console.error(e);
		}
	}

	function markRepliesRead() {
		const maxId = myMessages.reduce((max, m) => Math.max(max, m.id), 0);
		if (maxId > 0) {
			localStorage.setItem('last_seen_reply_id', String(maxId));
			lastSeenReplyId = maxId;
			unreadReplies = 0;
		}
	}

	async function fetchAdminMessages() {
		try {
			const [msgRes, banRes] = await Promise.all([fetch('/api/messages?admin=true'), fetch('/api/banned')]);
			if (msgRes.ok) adminMessages = await msgRes.json();
			if (banRes.ok) bannedList = await banRes.json();
		} catch (e) {
			console.error(e);
		}
	}

	async function fetchBanned() {
		banLoading = true;
		banMsg = '';
		try {
			const res = await fetch('/api/banned');
			if (res.ok) bannedList = await res.json();
		} catch (e) {
			console.error(e);
		} finally {
			banLoading = false;
		}
	}

	function banReasonValue(msgId: number): string {
		const el = document.querySelector<HTMLTextAreaElement>(`textarea[data-ban-msg-id="${msgId}"]`);
		return el?.value?.trim() || '';
	}

	async function handleBan(msg: any) {
		banLoading = true;
		banMsg = '';
		const reason = banReasonValue(msg.id);
		if (!reason) {
			banMsg = 'Напішыце паведамленне для заблакаванага карыстача';
			banLoading = false;
			return;
		}
		try {
			const res = await fetch('/api/banned', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userToken: msg.user_token,
					name: msg.name,
					telegram: msg.telegram,
					messageId: msg.id,
					reason,
				}),
			});
			if (res.ok) {
				banMsg = `Карыстач ${msg.name} заблакаваны`;
				const el = document.querySelector<HTMLTextAreaElement>(`textarea[data-ban-msg-id="${msg.id}"]`);
				if (el) el.value = '';
				await fetchAdminMessages();
			} else {
				const d = await res.json();
				banMsg = d.error || 'Памылка';
			}
		} catch (e) {
			banMsg = 'Памылка сеткі';
			console.error(e);
		} finally {
			banLoading = false;
		}
	}

	async function handleUnban(banId: number) {
		banLoading = true;
		banMsg = '';
		try {
			const res = await fetch('/api/banned', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: banId }),
			});
			if (res.ok) {
				bannedList = bannedList.filter((b) => b.id !== banId);
				banMsg = 'Бан зняты';
			} else {
				const d = await res.json();
				banMsg = d.error || 'Памылка';
			}
		} catch (e) {
			banMsg = 'Памылка сеткі';
			console.error(e);
		} finally {
			banLoading = false;
		}
	}

	async function handleUpdateBan(banId: number) {
		const reason = banEditDraft[banId]?.trim();
		if (!reason) return;
		banLoading = true;
		banMsg = '';
		try {
			const res = await fetch('/api/banned', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: banId, reason }),
			});
			if (res.ok) {
				bannedList = bannedList.map((b) => (b.id === banId ? { ...b, reason } : b));
				banMsg = 'Паведамленьне абноўленае';
			} else {
				const d = await res.json();
				banMsg = d.error || 'Памылка';
			}
		} catch (e) {
			banMsg = 'Памылка сеткі';
			console.error(e);
		} finally {
			banLoading = false;
		}
	}

	async function handleSubmit() {
		if (!name.trim() || !message.trim()) {
			error = 'Усе палі абавязковыя';
			return;
		}
		submitting = true;
		error = '';
		try {
			const res = await fetch('/api/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					telegram: telegram.trim(),
					message: message.trim(),
					userToken: userToken || undefined,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Не ўдалося адаслаць';
				return;
			}
			done = true;
		} catch (e) {
			error = 'Памылка сеткі';
			console.error(e);
		} finally {
			submitting = false;
		}
	}

	async function handleReply(msgId: number) {
		const text = replyDraft[msgId];
		if (!text?.trim()) return;
		replyLoading = { ...replyLoading, [msgId]: true };
		try {
			await fetch(`/api/messages/${msgId}/reply`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reply: text.trim() }),
			});
			replyDraft = { ...replyDraft, [msgId]: '' };
			await fetchAdminMessages();
		} catch (e) {
			console.error(e);
		} finally {
			replyLoading = { ...replyLoading, [msgId]: false };
		}
	}

	function openModal() {
		view = 'form';
		open = true;
		fetchMyMessages();
		if (devMode) fetchAdminMessages();
	}

	function openReplies() {
		view = 'my_messages';
		open = true;
		fetchMyMessages();
	}

	function close() {
		open = false;
		view = 'form';
		resetForm();
		adminMessages = [];
		bannedList = [];
		banMsg = '';
	}

	let modalTitle = $derived(
		view === 'bans'
			? 'Блякаваньні'
			: view === 'admin'
				? 'Паведаменьні'
				: view === 'my_messages'
					? 'Мае паведаменьні'
					: 'Напісаць творцу',
	);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && open && close()} />

<div class="contact-links">
	<button class="contact-link" onclick={openModal}>Напісаць творцу</button>
	<EasterEgg />
</div>

{#if !open && unreadReplies > 0 && !dismissedPopup}
	<div class="reply-popup">
		<div class="reply-popup-body">
			<strong>📩 Новы адказ</strong>
			<p>{myMessages[0]?.reply}</p>
		</div>
		<div class="reply-popup-actions">
			<button
				class="reply-popup-btn"
				onclick={() => {
					markRepliesRead();
					dismissedPopup = true;
					openReplies();
				}}
			>
				Паглядзець
			</button>
			<button
				class="reply-popup-close"
				onclick={() => {
					markRepliesRead();
					dismissedPopup = true;
				}}>×</button
			>
		</div>
	</div>
{/if}

<Modal title={modalTitle} {open} onclose={close} closeOnOverlay>
	{#if view === 'bans' && devMode}
		<div class="admin-msg-list">
			{#if banMsg}
				<div class="ban-msg">{banMsg}</div>
			{/if}
			{#each bannedList as ban (ban.id)}
				<div class="admin-msg">
					<div class="admin-msg-header">
						<strong>{ban.name || '?'}</strong>
						<span class="admin-msg-telegram">{ban.telegram}</span>
						<span class="admin-msg-date">{new Date(ban.created_at).toLocaleDateString()}</span>
					</div>
					{#if ban.messages}
						<div class="admin-msg-text">Паведамленьне: {ban.messages.message}</div>
					{/if}
					<div class="admin-reply-form">
						<label class="ban-edit-label">Паведамленьне для карыстача:</label>
						<textarea
							value={banEditDraft[ban.id] ?? ban.reason ?? ''}
							oninput={(e) => {
								banEditDraft = { ...banEditDraft, [ban.id]: e.currentTarget.value };
							}}
							rows="2"></textarea>
						<div class="admin-btn-row">
							<button
								class="submit-btn ban-btn"
								onclick={() => handleUnban(ban.id)}
								disabled={banLoading}
							>
								{banLoading ? '...' : 'Разблакаваць'}
							</button>
							<button
								class="submit-btn"
								onclick={() => handleUpdateBan(ban.id)}
								disabled={banLoading || (!banEditDraft[ban.id]?.trim() && !ban.reason?.trim())}
							>
								{banLoading ? '...' : 'Захаваць паведамленьне'}
							</button>
						</div>
					</div>
				</div>
			{/each}
			{#if bannedList.length === 0 && !banLoading}
				<div class="empty-state">Няма блякаваньняў</div>
			{/if}
		</div>
	{:else if view === 'admin' && devMode}
		<div class="admin-msg-list">
			{#if banMsg}
				<div class="ban-msg">{banMsg}</div>
			{/if}
			{#each adminMessages as msg (msg.id)}
				{@const ban = bannedLookup[msg.user_token || '']}
				<div class="admin-msg">
					<div class="admin-msg-header">
						<strong>{msg.name}</strong>
						<span class="admin-msg-telegram">{msg.telegram}</span>
						<span class="admin-msg-date">{new Date(msg.created_at).toLocaleDateString()}</span>
						{#if ban}
							<span class="ban-badge">🔨</span>
						{/if}
					</div>
					<div class="admin-msg-text">{msg.message}</div>
					{#if msg.reply}
						<div class="admin-reply">
							<span class="reply-label">Адказ:</span>
							{msg.reply}
						</div>
					{/if}
					{#if ban}
						<div class="ban-info">
							<span class="reply-label">Блякаваньне:</span>
							{ban.reason || '(няма паведамленьня)'}
						</div>
					{/if}
					<div class="admin-reply-form">
						<textarea
							value={replyDraft[msg.id] ?? ''}
							oninput={(e) => {
								replyDraft = { ...replyDraft, [msg.id]: e.currentTarget.value };
							}}
							placeholder="Напісаць адказ..."
							rows="2"></textarea>
						<div class="admin-btn-row">
							<button
								class="submit-btn"
								onclick={() => handleReply(msg.id)}
								disabled={replyLoading[msg.id] || !replyDraft[msg.id]?.trim()}
							>
								{replyLoading[msg.id] ? 'Адсыланьне...' : 'Адказаць'}
							</button>
						</div>
						<textarea
							data-ban-msg-id={msg.id}
							placeholder="Паведамленьне для заблякаванага карыстача..."
							rows="2"></textarea>
						<div class="admin-btn-row">
							<button class="submit-btn ban-btn" onclick={() => handleBan(msg)} disabled={banLoading}>
								{banLoading ? '...' : ban ? '📝 Абнавіць бан' : '🔨 Заблакаваць'}
							</button>
						</div>
					</div>
				</div>
			{/each}
			{#if adminMessages.length === 0}
				<div class="empty-state">Няма паведаменьняў</div>
			{/if}
		</div>
	{:else if view === 'my_messages'}
		<div class="admin-msg-list">
			{#each myMessages as msg (msg.id)}
				<div class="my-msg">
					<div class="my-msg-text">{msg.message}</div>
					<div class="my-msg-date">{new Date(msg.created_at).toLocaleDateString()}</div>
					{#if msg.reply}
						<div class="my-reply">
							<span class="reply-label">Адказ:</span>
							{msg.reply}
						</div>
					{/if}
				</div>
			{/each}
			{#if myMessages.length === 0}
				<div class="empty-state">Няма адказаў</div>
			{/if}
		</div>
	{:else if done}
		<div class="done-msg">Дзякую! Паведаменьне адасланае.</div>
	{:else}
		{#if unreadReplies > 0}
			<button
				class="unread-btn"
				onclick={async () => {
					view = 'my_messages';
					await fetchMyMessages();
					markRepliesRead();
				}}
			>
				📩 Ёсьць новы адказ ({unreadReplies})
			</button>
		{/if}
		{#if error}
			<div class="error-msg">{error}</div>
		{/if}
		<label>
			Як да вас зьвяртацца *
			<input type="text" bind:value={name} placeholder="Імя" />
		</label>
		<label>
			Telegram
			<input type="text" bind:value={telegram} placeholder="@username" />
		</label>
		<label>
			Паведаменьне *
			<textarea bind:value={message} placeholder="Што хацелі б сказаць?" rows="5"></textarea>
		</label>
	{/if}

	{#snippet footer()}
		{#if view === 'bans' && devMode}
			<button
				class="cancel-btn"
				onclick={() => {
					view = 'admin';
					fetchAdminMessages();
				}}>Назад</button
			>
		{:else if view === 'admin' && devMode}
			<button class="cancel-btn" onclick={() => (view = 'form')}>Назад</button>
			<button
				class="submit-btn"
				onclick={() => {
					view = 'bans';
					fetchBanned();
				}}
			>
				🔨 Блякаваньні
			</button>
		{:else if view === 'my_messages'}
			<button class="cancel-btn" onclick={() => (view = 'form')}>Назад</button>
		{:else if done}
			<button class="submit-btn" onclick={close}>Добра</button>
		{:else}
			{#if devMode}
				<button
					class="cancel-btn"
					onclick={() => {
						view = 'admin';
						fetchAdminMessages();
					}}
				>
					📋 Паведаменьні
				</button>
			{/if}
			<button class="cancel-btn" onclick={close}>Скасаваць</button>
			<button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
				{submitting ? 'Адсыланьне...' : 'Адаслаць'}
			</button>
		{/if}
	{/snippet}
</Modal>

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

	.done-msg {
		text-align: center;
		padding: 2rem 1.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--c-text-muted);
	}

	.unread-btn {
		padding: 0.6rem 1rem;
		border: 1.5px solid var(--c-primary);
		border-radius: var(--radius-sm);
		background: var(--c-primary-light);
		color: var(--c-primary);
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
	}
	.unread-btn:hover {
		opacity: 0.85;
	}

	.admin-msg-list {
		padding: 0;
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.my-msg,
	.admin-msg {
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--c-surface-hover);
		border: 1px solid var(--c-border);
		margin: 0 1.5rem 0.5rem;
	}
	.my-msg-text,
	.admin-msg-text {
		font-size: 0.9rem;
		margin-bottom: 0.3rem;
	}
	.my-msg-date,
	.admin-msg-date {
		font-size: 0.75rem;
		color: var(--c-text-muted);
	}
	.my-reply,
	.admin-reply {
		margin-top: 0.5rem;
		padding: 0.5rem 0.65rem;
		border-radius: var(--radius-sm);
		background: var(--c-primary-light);
		font-size: 0.85rem;
		border-left: 3px solid var(--c-primary);
	}
	.reply-label {
		font-weight: 600;
		color: var(--c-primary);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		display: block;
		margin-bottom: 0.15rem;
	}

	.admin-msg-header {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 0.3rem;
		font-size: 0.8rem;
	}
	.admin-msg-telegram {
		color: var(--c-text-muted);
	}
	.ban-badge {
		margin-left: auto;
		font-size: 0.9rem;
	}
	.ban-info {
		margin-top: 0.3rem;
		padding: 0.3rem 0.65rem;
		border-radius: var(--radius-sm);
		background: #fde8e8;
		font-size: 0.8rem;
		border-left: 3px solid #c0392b;
	}
	.ban-edit-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--c-text-muted);
	}
	.admin-reply-form {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.admin-reply-form textarea {
		padding: 0.5rem 0.7rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s;
		background: var(--c-surface);
		color: var(--c-text);
		resize: vertical;
		min-height: 50px;
	}
	.admin-reply-form textarea:focus {
		border-color: var(--c-primary);
	}
	.admin-reply-form .submit-btn {
		font-size: 0.8rem;
		padding: 0.4rem 1rem;
	}
	.admin-btn-row {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.ban-btn {
		background: #c0392b !important;
	}
	.ban-btn:hover {
		opacity: 0.85;
	}
	.ban-msg {
		padding: 0.5rem 1.5rem;
		font-size: 0.85rem;
		color: var(--c-primary);
		font-weight: 600;
	}

	.submit-btn {
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.submit-btn:hover {
		opacity: 0.85;
	}
	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

export interface ContactMessage {
	id: number;
	user_token: string | null;
	name: string | null;
	telegram: string | null;
	message: string;
	reply: string | null;
	created_at: string;
	ip_address: string | null;
	is_read: boolean;
}

class ContactStore {
	myMessages = $state<ContactMessage[]>([]);
	unreadReplies = $state(0);
	lastSeenReplyId = $state(0);
	dismissedPopup = $state(false);

	async fetchMyMessages(userToken: string) {
		if (!userToken) return;
		this.lastSeenReplyId = Number(localStorage.getItem('last_seen_reply_id') || '0');
		try {
			const res = await fetch(`/api/messages?token=${encodeURIComponent(userToken)}`);
			if (res.ok) {
				this.myMessages = await res.json();
				this.unreadReplies = this.myMessages.filter((m) => m.id > this.lastSeenReplyId).length;
			}
		} catch (e) {
			console.error(e);
		}
	}

	markRepliesRead() {
		const maxId = this.myMessages.reduce((max, m) => Math.max(max, m.id), 0);
		if (maxId > 0) {
			localStorage.setItem('last_seen_reply_id', String(maxId));
			this.lastSeenReplyId = maxId;
			this.unreadReplies = 0;
		}
	}
}

export const contact = new ContactStore();

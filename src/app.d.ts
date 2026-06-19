// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			banned?: boolean;
			banReason?: string | null;
		}
		interface PageData {
			banned?: boolean;
			banReason?: string | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

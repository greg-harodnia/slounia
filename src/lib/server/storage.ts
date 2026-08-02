import { getServiceClient } from '$lib/server/db';

export function getStorageClient() {
	return getServiceClient();
}

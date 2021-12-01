import { Content } from "./Content";

// STUB: Next step is to utilize the content recommenations to build out
// better user recommendations.

export class User {
	id: number;

	constructor({ id }: { id: number }) {
		this.id = id;
	}

	async getRecommendedContent({ type }: { type: string }) {
		// Get a bunch of highly rated and/or frequently consumed items by the user

		// Get related content from those items, filtering out items te user has consumed

		// If we have no data at this point, look to see what their friends like
			// (Some day, this might be more valuable than it is now and could be integrated/weighted)

		// If we have no data at this point, default to popular items
	}
}

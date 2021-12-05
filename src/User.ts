import { CallProcedure } from "./Connection";
import { Content } from "./Content";
import { FavoriteContentResults } from "./Models/FavoriteContentResults";
import { PopulateContent } from "./ContentLoader";
import { PopularContentResult } from "./Models/PopularContentResults";

export class User {
	id: number;
	name?: string;
	image?: string;
	cnt?: number;

	constructor({ id }: { id: number }) {
		this.id = id;
	}

	// TODO: Get recommended users. I have no idea what this would be based on.
	// Users that other users you follow also follow + people who follow you?
	// Most popular users? Some mix thereof?

	async getRecommendedUsers() {
		const users: User[] = await CallProcedure({
			proc: "usp_GetRecommendedUsers",
			args: [this.id, 20]
		});
		users.forEach((u) => {
			const imageID: number =
				u.image === null ? 0 : parseInt(u.image || "0");
			u.image =
				imageID == 0
					? undefined
					: `${Math.floor(imageID / 1000)}/${
							imageID % 100
					  }/${imageID}`;
		});
		return users;
	}

	async getRecommendedContent({ type }: { type: string }) {
		type = type.toUpperCase();

		let recommended: Content[] = await getSavedRecommendations({
			userID: this.id,
			type: type
		});
		if (recommended.length > 0) {
			return recommended;
		}

		// Get a bunch of highly rated and/or frequently consumed items by the user
		const favorites: Content[] = await getUserFavorites({
			userID: this.id,
			type: type
		});

		// Get related content from those items, filtering out items the user has consumed
		recommended = await getSimilarContent({
			content: favorites,
			userID: this.id,
			type: type
		});

		if (recommended.length < 20) {
			recommended = recommended.concat(
				await getPopularContent({ userID: this.id, type: type })
			);
		}

		recommended = recommended.slice(0, 20);
		saveRecommendations({
			userID: this.id,
			type: type,
			content: recommended
		});
		return recommended;
	}
}
const getSavedRecommendations = async ({
	userID,
	type
}: {
	userID: number;
	type: string;
}) => {
	const recommendations: Content[] = await CallProcedure({
		proc: "usp_GetRecommendedContent",
		args: [userID, type]
	});
	if (recommendations.length == 0) {
		return [];
	}
	return await PopulateContent({
		contentIDs: recommendations.map(({ id }) => {
			return id;
		})
	});
};
const saveRecommendations = async ({
	userID,
	type,
	content
}: {
	userID: number;
	type: string;
	content: Content[];
}) => {
	await CallProcedure({
		proc: "usp_CreateRecommendedContent",
		args: [
			userID,
			type,
			content
				.map(({ id }) => {
					return id;
				})
				.join(",")
		]
	});
};
const filterContent = async ({
	userID,
	content
}: {
	userID: number;
	content: Content[];
}) => {
	if (content.length > 0) {
		const viable: Content[] = await CallProcedure({
			proc: "usp_GetUnconsumedContent",
			args: [
				userID,
				content
					.map(({ id }) => {
						return id;
					})
					.join(",")
			]
		});
		content = content.filter((c) => {
			return (
				viable.filter((v) => {
					return c.id === v.id;
				}).length > 0
			);
		});
	}
	return content;
};
const getSimilarContent = async ({
	content,
	userID,
	type
}: {
	content: Content[];
	userID: number;
	type: string;
}) => {
	await Promise.all(
		content.map(async (c) => {
			const res = await c.getSimilarContent();
		})
	);
	let mergedContent: Content[] = [];
	content.forEach((c) => {
		mergedContent = mergedContent.concat(c.relatedContent || []);
	});
	// remove items the user has already consumed
	content = await filterContent({ userID: userID, content: mergedContent });
	content = sortAndDedupeRecommendations({ content: content, type: type });
	return content;
};
const sortAndDedupeRecommendations = ({
	content,
	type
}: {
	content: Content[];
	type: string;
}) => {
	content = content
		.filter((c) => {
			return c.type === type;
		})
		.sort((a, b) => {
			const diff =
				content.filter((c) => {
					return c.id === b.id;
				}).length -
				content.filter((c) => {
					return c.id === a.id;
				}).length;

			return diff;
		});
	const uniqueIDs: Record<number, number> = {};
	return content.filter((c) => {
		if (!(c.id in uniqueIDs)) {
			uniqueIDs[c.id] = 1;
			return true;
		}
		return false;
	});
};
const getUserFavorites = async ({
	userID,
	type
}: {
	userID: number;
	type: string;
}) => {
	const rows: FavoriteContentResults[] = await CallProcedure({
		proc: "usp_GetFavoriteContentByUser",
		args: [userID, type, 10]
	});
	const out: Content[] = [];
	rows.forEach((row) => {
		out.push(new Content({ id: row.id }));
	});
	return out;
};
const getPopularContent = async ({
	type,
	userID
}: {
	type: string;
	userID: number;
}) => {
	const popular: PopularContentResult[] = await CallProcedure({
		proc: "usp_GetPopularUnconsumedContent",
		args: [type, 20, userID]
	});
	const content: Content[] = await PopulateContent({
		contentIDs: popular.map(({ id }) => {
			return id;
		})
	});
	return content;
};

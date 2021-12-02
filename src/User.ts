import { CallProcedure } from "./Connection";
import { Content } from "./Content";
import { FavoriteContentResults } from "./Models/FavoriteContentResults";
import { PopulateContent } from "./ContentLoader";
import { PopularContentResult } from "./Models/PopularContentResults";

export class User {
	id: number;

	constructor({ id }: { id: number }) {
		this.id = id;
	}

	async getRecommendedContent({ type }: { type: string }) {
		type = type.toUpperCase();
		// Get a bunch of highly rated and/or frequently consumed items by the user
		const favorites: Content[] = await getUserFavorites({
			userID: this.id,
			type: type
		});

		// Get related content from those items, filtering out items the user has consumed
		const recommended: Content[] = await getSimilarContent({
			content: favorites,
			userID: this.id,
			type: type
		});

		// if we have at least 10 recommendations based on favorites, return those
		if (recommended.length >= 10) {
			return recommended.slice(0, 10);
		}
		return recommended.concat(
			await getPopularContent({ userID: this.id, type: type })
		);
	}
}
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
			if (diff == 0) {
				// Random sort in the case of ties to keep things lively!
				return 0.5 - Math.random();
			} else {
				return diff;
			}
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
		args: [type, 10, userID]
	});
	const content: Content[] = await PopulateContent({
		contentIDs: popular.map(({ id }) => {
			return id;
		})
	});
	return content;
};

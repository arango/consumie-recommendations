import { CallProcedure } from "./Connection";
import { CohortResult } from "./Models/CohortResult";
import { SimilarContentResults } from "./Models/SimilarContestResults";
import { Score } from "./Models/Score";
import { ContentData } from "./Models/ContentData";
import { Weight } from "./Models/Weight";
import { PopulateContent } from "./ContentLoader";

export class Content {
	id: number;
	name?: string;
	type?: string;
	image?: string;
	url?: string;
	data?: ContentData;
	raw_data?: string;
	relatedContent?: Content[];
	count?: number;

	constructor({
		id,
		name = undefined,
		type = undefined,
		image = undefined,
		url = undefined,
		data = undefined,
		raw_data = undefined
	}: {
		id: number;
		name?: string;
		type?: string;
		image?: string;
		url?: string;
		data?: ContentData;
		raw_data?: string;
	}) {
		this.id = id;
		this.name = name;
		this.type = type;
		this.image = image;
		this.url = url;
		this.data = data;
		this.raw_data = raw_data;
	}

	async getSimilarContent() {
		let existSimilar = await getExistingSimilarContent({
			contentID: this.id
		});
		// If there is recent content in the db, return that
		if (existSimilar.length > 0) {
			this.relatedContent = await PopulateContent({
				contentIDs: existSimilar
			});
			return this.relatedContent;
		}

		// Otherwise, get the info for building similar content
		// First get the list cohorts

		const listCohorts = await getListCohorts({
			contentID: this.id
		});

		// And the keyword cohorts

		const keywordCohorts = await getKeywordCohorts({
			contentID: this.id
		});

		// Build out the scores
		const cohorts: Record<number, Score> = {};

		listCohorts.concat(keywordCohorts).forEach((c) => {
			if (!cohorts.hasOwnProperty(c.content_id)) {
				let score: Score = {
					id: c.content_id,
					points: 0,
					reason: ""
				};
				cohorts[c.content_id] = score;
			}
			let points: number = c.frequency * weights[c.type].weight;
			if (points > weights[c.type].cap) {
				points = weights[c.type].cap;
			}

			cohorts[c.content_id].points =
				cohorts[c.content_id].points + points;

			// Attaching reasons in case we want to debug/mess with weights
			cohorts[c.content_id].reason += `${c.type} Pts: ${points} `;
		});

		// Sort by scores and get top 20
		let sorted = Object.values(cohorts)
			.sort((a, b) => {
				return b.points - a.points;
			})
			.slice(0, 20);

		// Save to DB
		saveSimilarContent({ contentID: this.id, similarContent: sorted });
		const ids: number[] = sorted.map(({ id }) => {
			return id;
		});
		this.relatedContent = await PopulateContent({
			contentIDs: ids
		});
		return this.relatedContent;
	}
}
const getExistingSimilarContent = async ({
	contentID
}: {
	contentID: number;
}) => {
	let rows: SimilarContentResults[] = await CallProcedure({
		proc: "usp_GetSimilarContent",
		args: [contentID]
	});
	let out: number[] = [];
	rows.forEach((row) => {
		out.push(row.similar_id);
	});
	return out;
};
const getListCohorts = async ({ contentID }: { contentID: number }) => {
	let rows: CohortResult[] = await CallProcedure({
		proc: "usp_GetListCohorts",
		args: [contentID]
	});
	return rows;
};
const getKeywordCohorts = async ({ contentID }: { contentID: number }) => {
	let rows: CohortResult[] = await CallProcedure({
		proc: "usp_GetKeywordCohorts",
		args: [contentID]
	});
	return rows;
};
const saveSimilarContent = async ({
	contentID,
	similarContent
}: {
	contentID: number;
	similarContent: Score[];
}) => {
	let values: string[] = [];
	let args: number[] = [];
	let i: number = 0;
	await CallProcedure({
		proc: "usp_CreateSimilarContent",
		args: [
			contentID,
			similarContent
				.map(({ id }) => {
					return id;
				})
				.join(",")
		]
	});
};

// Define weighting logic values
const weights: Record<string, Weight> = {
	PERFORMER: {
		weight: 0.9,
		cap: 4
	},
	CREATOR: {
		weight: 1.25,
		cap: 3
	},
	GENRE: {
		weight: 0.5,
		cap: 1
	},
	MEDIUM: {
		weight: 0.75,
		cap: 1.5
	},
	LIST_FREQUENCY: {
		weight: 0.8,
		cap: 3
	}
};

import { CallProcedure } from "./Connection";
import { ContentData } from "./ContentData";

export class Content {
	id: number;
	name?: string;
	type?: string;
	image?: string;
	url?: string;
	data?: ContentData;
	raw_data?: string;

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

	weights: Record<string, number> = {
		PERFORMER: 1,
		CREATOR: 1,
		GENRE: 0.5,
		MEDIUM: 1,
		LIST_FREQUENCY: 0.8
	};

	async getSimilarContent() {
		let existSimilar = await getExistingSimilarContent({
			contentID: this.id
		});
		//console.log(existSimilar);
		// If there is recent content in the db, return that
		if (existSimilar.length > 0) {
			return await populateContent({ similarIDs: existSimilar });
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
			cohorts[c.content_id].points =
				cohorts[c.content_id].points +
				c.frequency * this.weights[c.type];

			// Attaching reasons in case we want to debug/mess with weights
			cohorts[
				c.content_id
			].reason += `Type: ${c.type} Pts: ${c.frequency} `;
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
		return await populateContent({ similarIDs: ids });
	}
}
const getExistingSimilarContent = async ({
	contentID
}: {
	contentID: number;
}) => {
	type ExistingSimilarContentResults = {
		similar_id: number;
	}
	let rows: ExistingSimilarContentResults[] = await CallProcedure({
		proc: "usp_GetSimilarContent",
		args: [contentID] }
	)
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
		args: [contentID, similarContent.map(({id}) => {
			return id
		}).join(",")]
	});
};
const populateContent = async ({ similarIDs }: { similarIDs: number[] }) => {
	if (similarIDs.length == 0) {
		return [];
	}
	let rows: Content[] = await CallProcedure({
		proc: "usp_GetContents",
		args: [similarIDs.join(",")]
	});
	rows.forEach((row) => {
		const parenthetical: string = JSON.parse(
			row.raw_data || "{}"
		).parenthetical;
		row.data = new ContentData({
			parenthetical: parenthetical
		});
		delete row.raw_data;
		row.image =
			row.image === null
				? undefined
				: `${Math.floor(row.id / 1000)}/${row.id % 100}/${
						row.id
					}`;
	});
	return rows.sort((a, b) => {
		let a_pos: number = -1;
		let b_pos: number = -1;
		let i = 0;
		similarIDs.forEach((id) => {
			if (id == a.id) {
				a_pos = i;
			}
			if (id == b.id) {
				b_pos = i;
			}
			i++;
		});
		return a_pos - b_pos;
	});
};
type CohortResult = {
	content_id: number;
	type: string;
	frequency: number;
}
type Score = {
	id: number;
	points: number;
	reason: string;
}

import { Connection } from "./Connection";

export class Content {
	id: number;
	name?: string;
	type?: string;
	image?: string;

	constructor({
		id,
		name = undefined,
		type = undefined,
		image = undefined
	}: {
		id: number;
		name?: string;
		type?: string;
		image?: string;
	}) {
		this.id = id;
		this.name = name;
		this.type = type;
		this.image = image;
	}

	weights: Record<string, number> = {
		ACTOR: 1,
		ARTIST: 1,
		CREATOR: 1,
		DIRECTOR: 0.5,
		GENRE: 0.5,
		PLATFORM: 0.5,
		WRITER: 1,
		LIST_FREQUENCY: 0.8
	};

	async getSimilarContent() {
		let existSimilar = await getExitingSimilarContent({
			contentID: this.id
		});
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

			// Storing reasons in case we want to debug/mess with weights
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
const getExitingSimilarContent = async ({
	contentID
}: {
	contentID: number;
}) => {
	interface ExistingSimilarContentResults {
		similar_id: number;
	}
	let rows: ExistingSimilarContentResults[] = [];
	try {
		[rows] = await Connection().conn.query(
			"SELECT similar_id FROM content_similar WHERE content_id = ? AND date_created > DATE_SUB(NOW(), INTERVAL 7 DAY)",
			[contentID]
		);
	} catch (e) {}
	let out: number[] = [];
	rows.forEach((row) => {
		out.push(row.similar_id);
	});
	return out;
};
const getListCohorts = async ({ contentID }: { contentID: number }) => {
	let rows: CohortResult[] = [];
	try {
		[rows] = await Connection().conn.query(
			"SELECT content_id, 'LIST_FREQUENCY' AS type, COUNT(list_id) AS frequency FROM map_list_content WHERE content_id != ? AND list_id IN (SELECT list_id FROM map_list_content WHERE content_id = ?) GROUP BY content_id",
			[contentID, contentID]
		);
	} catch (e) {}
	return rows;
};
const getKeywordCohorts = async ({ contentID }: { contentID: number }) => {
	let rows: CohortResult[] = [];
	try {
		[rows] = await Connection().conn.query(
			`
               SELECT ck1.content_id, ck1.type, COUNT(ck1.id) AS frequency
               FROM content_keywords ck1
               INNER JOIN content_keywords ck2 ON
               ck1.keyword = ck2.keyword AND ck2.type = ck2.type
               WHERE ck2.content_id = ? AND ck1.content_id != ?
               GROUP BY ck1.content_id, ck1.type
               `,
			[contentID, contentID]
		);
	} catch (e) {}

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
	similarContent.forEach((sc) => {
		values.push("(?, ?, ?, NOW())");
		args.push(contentID, sc.id, i);
		i++;
	});
	try {
		await Connection().conn.query(
			"DELETE FROM content_similar WHERE content_id = ?",
			[contentID]
		);
		await Connection().conn.query(
			`
               INSERT INTO content_similar (content_id, similar_id, sort_order, date_created) VALUES
               ${values.join(", ")}
               `,
			args
		);
	} catch (e) {}
};
const populateContent = async ({ similarIDs }: { similarIDs: number[] }) => {
	let rows: Content[] = [];
	try {
		[rows] = await Connection().conn.query(
			"SELECT id, name, image, type FROM content WHERE id IN (?)",
			[similarIDs]
		);
		rows.forEach((row) => {
			row.image =
				row.image === null
					? undefined
					: `${Math.floor(row.id / 1000)}/${row.id % 100}/${
							row.id
					  }`;
		});
	} catch (e) {}
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
interface CohortResult {
	content_id: number;
	type: string;
	frequency: number;
}
interface Score {
	id: number;
	points: number;
	reason: string;
}

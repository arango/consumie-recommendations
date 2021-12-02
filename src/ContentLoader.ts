import { Content } from "./Content";
import { CallProcedure } from "./Connection";

export const PopulateContent = async ({
	contentIDs
}: {
	contentIDs: number[];
}) => {
	if (contentIDs.length == 0) {
		return [];
	}
	let rows: Content[] = await CallProcedure({
		proc: "usp_GetContents",
		args: [contentIDs.join(",")]
	});
	rows.forEach((row) => {
		const parenthetical: string = JSON.parse(
			row.raw_data || "{}"
		).parenthetical;
		row.data = {
			parenthetical: parenthetical
		};
		delete row.raw_data;
		row.image =
			row.image === null
				? undefined
				: `${Math.floor(row.id / 1000)}/${row.id % 100}/${row.id}`;
	});
	return rows.sort((a, b) => {
		let a_pos: number = -1;
		let b_pos: number = -1;
		let i = 0;
		contentIDs.forEach((id) => {
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

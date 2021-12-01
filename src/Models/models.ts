export type SimilarContentResults = {
    similar_id: number;
};
export type CohortResult = {
	content_id: number;
	type: string;
	frequency: number;
};
export type Score = {
	id: number;
	points: number;
	reason: string;
};
export type ContentData = {
    parenthtical: string;
};
export type Weight = {
    weight: number,
    cap: number
};
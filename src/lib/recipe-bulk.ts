/**
 * Turn the bulk-entry textareas into form rows. Each line is one item, so the
 * result can be appended to the editable list and its count updates in the same
 * step. A leading Markdown list marker is ignored, letting a pasted numbered
 * list become plain steps instead of duplicating the app's own numbering.
 */

const LIST_PREFIX = /^\s*(?:[-*+]|\d+[.)])\s+/;
const COMMA = /[,،]/;

export type BulkIngredient = {
	quantity: string;
	unit: string;
	name: string;
	note: string;
};

function lines(value: string) {
	return value
		.split(/\r?\n/)
		.map((line) => line.replace(LIST_PREFIX, '').trim())
		.filter(Boolean);
}

export function parseBulkSteps(value: string): string[] {
	return lines(value);
}

function looksLikeQuantity(value: string) {
	return /^[\d\s./+\-¼½¾⅓⅔⅛⅜⅝⅞]+$/.test(value);
}

export function parseBulkIngredients(value: string): BulkIngredient[] {
	return lines(value)
		.map((line) => {
			const fields = line.split(COMMA).map((field) => field.trim());
			let quantity = '';
			let unit = '';
			let name = '';
			let note = '';

			if (fields.length >= 4) {
				quantity = fields[0];
				unit = fields[1];
				name = fields[2];
				note = fields.slice(3).join(', ');
			} else if (fields.length === 3) {
				quantity = fields[0];
				unit = fields[1];
				name = fields[2];
			} else if (fields.length === 2) {
				if (looksLikeQuantity(fields[0])) {
					quantity = fields[0];
					name = fields[1];
				} else {
					name = fields[0];
					note = fields[1];
				}
			} else {
				name = fields[0] ?? '';
			}

			// Allow `Salt, , , to taste` without making the user count empty
			// leading slots: if the name slot is empty and the first field is
			// clearly not a quantity, treat it as the ingredient name.
			if (!name && quantity && !looksLikeQuantity(quantity)) {
				name = quantity;
				quantity = '';
			}

			return { quantity, unit, name, note };
		})
		.filter((item) => item.name.length > 0);
}

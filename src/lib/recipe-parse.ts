/**
 * Turn raw text lifted from a PDF into the shape the recipe form understands.
 *
 * Everything here is deliberately deterministic: no network calls, no model
 * keys. PDFs of recipes share a small vocabulary of headings and units, and a
 * careful parser gets most of the way there. The result is always presented as
 * a draft to review, never saved silently.
 */

export type ParsedIngredient = {
	quantity: string;
	unit: string;
	name: string;
	note: string;
};

export type ParsedRecipe = {
	title: string;
	description: string;
	notes: string;
	servings: number | null;
	prepMinutes: number | null;
	cookMinutes: number | null;
	ingredients: ParsedIngredient[];
	steps: string[];
};

type Section = 'ingredients' | 'method' | 'notes';

const INGREDIENT_HEADING =
	/^(?:ingredients?(?: list)?|you(?:'|’)ll need|you will need|what you(?:'|’)ll need|what you need|shopping list)$/;
const METHOD_HEADING =
	/^(?:method|instructions?|directions?|steps?|preparation|procedure|how to (?:make|cook|prepare)|cooking|assembly)$/;
const NOTES_HEADING =
	/^(?:notes?|tips?|chef(?:'|’)s notes?|storage|to serve|serving suggestion|garnish|nutrition(?:al)?(?: information)?|equipment)$/;

const UNIT_ALIASES: Record<string, string> = {
	tsp: 'tsp',
	tsps: 'tsp',
	teaspoon: 'tsp',
	teaspoons: 'tsp',
	tbsp: 'tbsp',
	tbsps: 'tbsp',
	tbs: 'tbsp',
	tablespoon: 'tbsp',
	tablespoons: 'tbsp',
	cup: 'cup',
	cups: 'cup',
	g: 'g',
	gr: 'g',
	gram: 'g',
	grams: 'g',
	kg: 'kg',
	kilogram: 'kg',
	kilograms: 'kg',
	mg: 'mg',
	ml: 'ml',
	milliliter: 'ml',
	milliliters: 'ml',
	millilitre: 'ml',
	millilitres: 'ml',
	l: 'l',
	liter: 'l',
	liters: 'l',
	litre: 'l',
	litres: 'l',
	oz: 'oz',
	ounce: 'oz',
	ounces: 'oz',
	lb: 'lb',
	lbs: 'lb',
	pound: 'lb',
	pounds: 'lb',
	clove: 'clove',
	cloves: 'clove',
	can: 'can',
	cans: 'can',
	tin: 'tin',
	tins: 'tin',
	jar: 'jar',
	jars: 'jar',
	bunch: 'bunch',
	bunches: 'bunch',
	sprig: 'sprig',
	sprigs: 'sprig',
	stalk: 'stalk',
	stalks: 'stalk',
	slice: 'slice',
	slices: 'slice',
	piece: 'piece',
	pieces: 'piece',
	pinch: 'pinch',
	pinches: 'pinch',
	dash: 'dash',
	dashes: 'dash',
	handful: 'handful',
	handfuls: 'handful',
	packet: 'packet',
	packets: 'packet',
	pkg: 'packet',
	pkgs: 'packet',
	package: 'packet',
	packages: 'packet',
	stick: 'stick',
	sticks: 'stick',
	head: 'head',
	heads: 'head',
	fillet: 'fillet',
	fillets: 'fillet',
	sheet: 'sheet',
	sheets: 'sheet',
	knob: 'knob',
	knobs: 'knob',
	splash: 'splash',
	drop: 'drop',
	drops: 'drop',
	pint: 'pint',
	pints: 'pint',
	quart: 'quart',
	quarts: 'quart',
	gallon: 'gallon',
	gallons: 'gallon',
	'fl oz': 'fl oz'
};

const PREP_NOTE =
	/^(?:to taste|to serve|for serving|for garnish|plus more|as needed|as desired|optional|divided|chopped|diced|minced|sliced|grated|shredded|melted|softened|beaten|whisked|sifted|peeled|seeded|trimmed|rinsed|drained|crushed|cubed|halved|quartered|cut|torn|crumbled|finely|roughly|thinly|freshly|room temperature|cold|warm|at room temperature)\b/i;

const QUANTITY =
	/^(?:about\s+|approx(?:imately)?\.?\s+|around\s+)?((?:\d+\s+)?\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞])(?:\s*(?:-|–|—|to)\s*(\d+(?:[.,]\d+)?))?/i;

function isHeading(line: string, pattern: RegExp) {
	const key = line
		.replace(/[:\uFF1A]+$/, '')
		.trim()
		.toLowerCase();
	const withoutParenthetical = key.replace(/\s*\([^)]*\)\s*$/, '').trim();
	return pattern.test(key) || pattern.test(withoutParenthetical);
}

function headingKind(line: string): Section | null {
	if (isHeading(line, INGREDIENT_HEADING)) return 'ingredients';
	if (isHeading(line, METHOD_HEADING)) return 'method';
	if (isHeading(line, NOTES_HEADING)) return 'notes';
	return null;
}

function looksLikeGroupHeading(line: string) {
	if (/^for\b/i.test(line) && line.split(/\s+/).length <= 6 && !/\d/.test(line)) return true;
	if (/:\s*$/.test(line) && line.length < 48) return true;
	return false;
}

/** Lines that are page furniture rather than recipe content. */
function isNoise(line: string) {
	if (/^page\s+\d+(?:\s+of\s+\d+)?$/i.test(line)) return true;
	if (/^\d{1,3}$/.test(line)) return true;
	if (/^https?:\/\//i.test(line)) return true;
	if (/^www\./i.test(line)) return true;
	if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(line)) return true;
	return false;
}

function stripPrefix(line: string) {
	return line
		.replace(/^[•·▪◦‣●○*\-–—]+\s*/, '')
		.replace(/^\d{1,2}\s*[.)]\s+/, '')
		.replace(/^step\s+\d+\s*[.:]\s*/i, '')
		.trim();
}

function normalizeQuantity(raw: string) {
	return raw
		.replace(/\s*[-–—]\s*/g, '-')
		.replace(/\s+to\s+/gi, '-')
		.replace(/\s+/g, ' ')
		.trim();
}

function takeUnit(text: string): { unit: string; rest: string } | null {
	const twoWords = /^([a-z]+\s+[a-z]+)\.?\s+/i.exec(text);
	if (twoWords) {
		const unit = UNIT_ALIASES[twoWords[1].toLowerCase()];
		if (unit) return { unit, rest: text.slice(twoWords[0].length) };
	}

	const oneWord = /^([a-z]+)\.?\s+/i.exec(text);
	if (oneWord) {
		const unit = UNIT_ALIASES[oneWord[1].toLowerCase()];
		if (unit) return { unit, rest: text.slice(oneWord[0].length) };
	}

	return null;
}

function parseIngredientLine(raw: string): ParsedIngredient {
	let rest = stripPrefix(raw);
	let quantity = '';

	const quantityMatch = QUANTITY.exec(rest);

	if (quantityMatch) {
		quantity = normalizeQuantity(quantityMatch[0]);
		rest = rest.slice(quantityMatch[0].length).trimStart();
	} else {
		// "A pinch of salt" is a quantity of one pinch, even without a digit.
		const article = /^(an?|one)\s+/i.exec(rest);
		if (article && takeUnit(rest.slice(article[0].length))) {
			quantity = '1';
			rest = rest.slice(article[0].length).trimStart();
		}
	}

	let unit = '';
	const unitMatch = takeUnit(rest);
	if (unitMatch) {
		unit = unitMatch.unit;
		rest = unitMatch.rest;
	}

	rest = rest.replace(/^of\s+/i, '').trim();

	let note = '';
	const parentheticals: string[] = [];
	rest = rest.replace(/\(([^)]*)\)/g, (_, inner: string) => {
		const value = inner.trim();
		if (value) parentheticals.push(value);
		return ' ';
	});

	// A trailing prep instruction ("flour, sifted") becomes the note, but only
	// when it reads like one — a list such as "salt, pepper, oregano" stays whole.
	const comma = rest.indexOf(',');
	if (comma > 0) {
		const head = rest.slice(0, comma).trim();
		const tail = rest.slice(comma + 1).trim();
		if (head && tail && tail.length <= 48 && PREP_NOTE.test(tail)) {
			note = tail;
			rest = head;
		}
	}

	const name = rest
		.replace(/\s+/g, ' ')
		.replace(/^[,;:.\-–—]+/, '')
		.replace(/[,;:]+$/, '')
		.trim();

	const notes = [note, ...parentheticals].filter(Boolean).join(', ');

	if (!name) {
		// Something like "2 tbsp" with no ingredient named: keep the line usable.
		return { quantity: '', unit: '', name: raw.trim(), note: '' };
	}

	return { quantity, unit, name, note: notes };
}

function durationMinutes(raw: string): number | null {
	let total = 0;

	const hours = /(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?|h)\b/i.exec(raw);
	if (hours) total += Number.parseFloat(hours[1].replace(',', '.')) * 60;

	const minutes = /(\d+)\s*(?:minutes?|mins?|m)\b/i.exec(raw);
	if (minutes) total += Number.parseInt(minutes[1], 10);

	if (total > 0) return Math.round(total);

	const bare = /^\s*(\d{1,3})\s*$/.exec(raw);
	return bare ? Number.parseInt(bare[1], 10) : null;
}

function labelledMinutes(lines: string[], label: RegExp): number | null {
	for (const line of lines) {
		const match = label.exec(line);
		if (!match) continue;

		const value = durationMinutes(line.slice(match.index + match[0].length));
		if (value !== null) return value;
	}

	return null;
}

function findServings(lines: string[]): number | null {
	const patterns = [
		/\b(?:serves|servings?|yield|makes|portions?)\s*[:\-–]?\s*(\d{1,3})\b/i,
		/\b(\d{1,3})\s*(?:servings?|portions?)\b/i
	];

	for (const line of lines) {
		for (const pattern of patterns) {
			const match = pattern.exec(line);
			if (match) {
				const value = Number.parseInt(match[1], 10);
				if (value > 0 && value <= 100) return value;
			}
		}
	}

	return null;
}

function cleanTitle(line: string) {
	return line
		.replace(/^recipe\s*[:\-–]\s*/i, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function chooseTitle(
	lines: string[],
	firstSection: number,
	metaTitle: string | undefined
): { title: string; usedLine: number } {
	const metadata = metaTitle
		?.replace(/^microsoft\s+word\s*[-–]\s*/i, '')
		.replace(/\.(?:docx?|pdf)$/i, '')
		.trim();

	const limit = firstSection === -1 ? Math.min(lines.length, 8) : Math.min(firstSection, 8);
	const candidates: { title: string; index: number }[] = [];

	for (let index = 0; index < limit; index += 1) {
		const line = lines[index];
		if (!line || isNoise(line) || headingKind(line)) continue;

		const title = cleanTitle(line);
		if (title.length < 3 || title.length > 90) continue;
		if (/^(?:serves|servings?|yield|makes|prep|cook|total|ready in)\b/i.test(title)) continue;
		if (/\b(?:time|minutes?|servings?)\s*[:•|]/i.test(title) && title.includes('|')) continue;

		candidates.push({ title, index });
	}

	if (
		metadata &&
		metadata.length >= 3 &&
		metadata.length <= 90 &&
		!/^(?:untitled|document|recipe)$/i.test(metadata)
	) {
		return { title: metadata, usedLine: candidates[0]?.index ?? -1 };
	}

	if (candidates[0]) return { title: candidates[0].title, usedLine: candidates[0].index };

	return { title: 'Imported recipe', usedLine: -1 };
}

function buildDescription(lines: string[], titleIndex: number, firstSection: number): string {
	if (firstSection === -1 || titleIndex === -1) return '';

	const intro = lines
		.slice(titleIndex + 1, firstSection)
		.filter((line) => {
			if (isNoise(line) || headingKind(line)) return false;
			if (
				/^(?:serves|servings?|yield|makes|prep(?:aration)?|cook(?:ing)?|total|ready in)\b/i.test(
					line
				)
			)
				return false;
			if (/^by\s+/i.test(line)) return false;
			return true;
		})
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (intro.length <= 3) return '';
	if (intro.length <= 420) return intro;

	return `${intro.slice(0, 417).replace(/\s+\S*$/, '')}…`;
}

function buildIngredients(lines: string[]): ParsedIngredient[] {
	const ingredients: ParsedIngredient[] = [];

	for (const line of lines) {
		if (headingKind(line) || looksLikeGroupHeading(line) || isNoise(line)) continue;

		const text = line.trim();
		if (!text) continue;

		// A wrapped ingredient usually resumes in lowercase or after a comma.
		const previous = ingredients.at(-1);
		if (previous && (/^[a-z(]/.test(text) || /^[,;]/.test(text))) {
			previous.name = `${previous.name} ${text}`.replace(/\s+/g, ' ').trim();
			continue;
		}

		const parsed = parseIngredientLine(text);
		if (parsed.name.length > 0) ingredients.push(parsed);
	}

	return ingredients.slice(0, 100);
}

function buildSteps(lines: string[]): string[] {
	const cleaned = lines
		.filter((line) => !headingKind(line) && !isNoise(line))
		.map((line) => ({
			text: line,
			numbered: /^\s*(?:\d{1,2}\s*[.)]|step\s+\d+\s*[.:])\s*/i.test(line)
		}))
		.filter((entry) => entry.text.trim().length > 0);

	if (cleaned.length === 0) return [];

	const hasNumbers = cleaned.filter((entry) => entry.numbered).length >= 2;
	const steps: string[] = [];

	if (hasNumbers) {
		for (const entry of cleaned) {
			const body = stripPrefix(entry.text);
			if (!body) continue;

			if (entry.numbered || steps.length === 0) {
				steps.push(body);
			} else {
				steps[steps.length - 1] += ` ${body}`;
			}
		}
	} else {
		for (const entry of cleaned) {
			const body = stripPrefix(entry.text);
			if (!body) continue;

			const previous = steps.at(-1);
			const startsNew =
				!previous || /^\s*[•·▪◦‣●○*\-–—]/.test(entry.text) || /[.!?:](?:["')\]]?)$/.test(previous);

			if (startsNew) steps.push(body);
			else steps[steps.length - 1] = `${previous} ${body}`;
		}
	}

	return steps
		.map((step) => step.replace(/\s+/g, ' ').trim())
		.filter((step) => step.length > 0)
		.slice(0, 80);
}

export function parseRecipeText(raw: string, options: { title?: string } = {}): ParsedRecipe {
	const lines = raw
		.replace(/\r\n?/g, '\n')
		.replace(/\u00ad/g, '')
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/\u00a0/g, ' ')
		.replace(/[ \t\f\v]+/g, ' ')
		.split('\n')
		.map((line) => line.trim());

	const content = lines.filter((line) => line.length > 0);

	let ingredientsStart = -1;
	let methodStart = -1;
	let notesStart = -1;

	for (let index = 0; index < content.length; index += 1) {
		const kind = headingKind(content[index]);
		if (kind === 'ingredients' && ingredientsStart === -1) ingredientsStart = index;
		if (kind === 'method' && methodStart === -1) methodStart = index;
		if (kind === 'notes' && notesStart === -1) notesStart = index;
	}

	const firstSection =
		[ingredientsStart, methodStart, notesStart]
			.filter((index) => index !== -1)
			.sort((a, b) => a - b)[0] ?? -1;

	const { title, usedLine } = chooseTitle(content, firstSection, options.title);

	const ingredientsEnd =
		[methodStart, notesStart]
			.filter((index) => index !== -1 && ingredientsStart !== -1 && index > ingredientsStart)
			.sort((a, b) => a - b)[0] ?? content.length;

	const methodEnd =
		[notesStart]
			.filter((index) => index !== -1 && methodStart !== -1 && index > methodStart)
			.sort((a, b) => a - b)[0] ?? content.length;

	let ingredients =
		ingredientsStart !== -1
			? buildIngredients(content.slice(ingredientsStart + 1, ingredientsEnd))
			: [];

	let steps = methodStart !== -1 ? buildSteps(content.slice(methodStart + 1, methodEnd)) : [];

	// No headings at all? Look for a run of numbered instructions anywhere.
	if (steps.length === 0) {
		const numbered = content.filter((line) => /^\s*\d{1,2}\s*[.)]\s+\S/.test(line));
		if (numbered.length >= 2) steps = buildSteps(numbered);
	}

	// No ingredients heading, but a method heading: treat the short lines just
	// before it as the list rather than leaving the form empty.
	if (ingredients.length === 0 && methodStart > 2) {
		const candidates = content
			.slice(Math.max(usedLine + 1, 0), methodStart)
			.filter(
				(line) =>
					!headingKind(line) &&
					!isNoise(line) &&
					(QUANTITY.test(line) || /^[•·▪◦‣●○*\-–—]/.test(line))
			);

		if (candidates.length >= 2) ingredients = buildIngredients(candidates);
	}

	const notes =
		notesStart !== -1
			? content
					.slice(notesStart + 1)
					.filter((line) => !isNoise(line))
					.join('\n')
					.replace(/\n{2,}/g, '\n')
					.trim()
					.slice(0, 2000)
			: '';

	const prepMinutes = labelledMinutes(content, /\bprep(?:aration)?(?:\s*time)?\b\s*[:\-–]?\s*/i);
	const cookMinutes = labelledMinutes(
		content,
		/\b(?:cook(?:ing)?|bake|roast)(?:\s*time)?\b\s*[:\-–]?\s*/i
	);
	const totalMinutes = labelledMinutes(content, /\btotal(?:\s*time)?\b\s*[:\-–]?\s*/i);

	return {
		title,
		description: buildDescription(content, usedLine, firstSection),
		notes,
		servings: findServings(content),
		prepMinutes,
		cookMinutes: cookMinutes ?? (prepMinutes === null ? totalMinutes : null),
		ingredients,
		steps
	};
}

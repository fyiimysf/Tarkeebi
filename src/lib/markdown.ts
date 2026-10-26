/**
 * A deliberately small Markdown parser for recipe step instructions.
 *
 * It supports the syntax people actually use in a recipe — emphasis, links,
 * lists, blockquotes, headings, code, and hard line breaks. It returns an AST
 * made only of known nodes, so raw HTML can never be passed through and a
 * public recipe cannot inject markup into another visitor's page.
 */

export type MarkdownInline =
	| { type: 'text'; value: string }
	| { type: 'break' }
	| { type: 'code'; value: string }
	| { type: 'strong'; children: MarkdownInline[] }
	| { type: 'em'; children: MarkdownInline[] }
	| { type: 'del'; children: MarkdownInline[] }
	| { type: 'link'; href: string; external: boolean; children: MarkdownInline[] };

export type MarkdownBlock =
	| { type: 'paragraph'; children: MarkdownInline[] }
	| { type: 'heading'; level: number; children: MarkdownInline[] }
	| { type: 'list'; ordered: boolean; items: MarkdownInline[][] }
	| { type: 'blockquote'; children: MarkdownInline[] }
	| { type: 'code'; value: string }
	| { type: 'hr' };

function isSafeHref(value: string) {
	if (!value) return false;
	if (value.startsWith('#') || value.startsWith('/')) return true;

	try {
		const url = new URL(value, 'https://tarkeebi.invalid');
		return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
	} catch {
		return false;
	}
}

function parseInline(source: string): MarkdownInline[] {
	const nodes: MarkdownInline[] = [];
	let text = '';
	let index = 0;

	function flushText() {
		if (!text) return;
		nodes.push({ type: 'text', value: text });
		text = '';
	}

	while (index < source.length) {
		const character = source[index];

		if (character === '\\' && index + 1 < source.length) {
			text += source[index + 1];
			index += 2;
			continue;
		}

		if (character === '`') {
			const end = source.indexOf('`', index + 1);
			if (end !== -1) {
				flushText();
				nodes.push({ type: 'code', value: source.slice(index + 1, end) });
				index = end + 1;
				continue;
			}
		}

		if (source.startsWith('**', index) || source.startsWith('__', index)) {
			const marker = source.slice(index, index + 2);
			const end = source.indexOf(marker, index + 2);
			if (end !== -1 && end > index + 2) {
				flushText();
				nodes.push({ type: 'strong', children: parseInline(source.slice(index + 2, end)) });
				index = end + 2;
				continue;
			}
		}

		if (source.startsWith('~~', index)) {
			const end = source.indexOf('~~', index + 2);
			if (end !== -1 && end > index + 2) {
				flushText();
				nodes.push({ type: 'del', children: parseInline(source.slice(index + 2, end)) });
				index = end + 2;
				continue;
			}
		}

		if (character === '*' || character === '_') {
			const end = source.indexOf(character, index + 1);
			if (end !== -1 && end > index + 1) {
				flushText();
				nodes.push({ type: 'em', children: parseInline(source.slice(index + 1, end)) });
				index = end + 1;
				continue;
			}
		}

		if (character === '[') {
			const close = source.indexOf(']', index + 1);
			if (close !== -1 && source[close + 1] === '(') {
				const end = source.indexOf(')', close + 2);
				if (end !== -1) {
					const inner = source.slice(close + 2, end).trim();
					const href = inner.split(/\s+/)[0] ?? '';
					if (isSafeHref(href)) {
						flushText();
						nodes.push({
							type: 'link',
							href,
							external: /^https?:/i.test(href),
							children: parseInline(source.slice(index + 1, close))
						});
						index = end + 1;
						continue;
					}
				}
			}
		}

		if (character === '\n') {
			flushText();
			nodes.push({ type: 'break' });
			index += 1;
			continue;
		}

		text += character;
		index += 1;
	}

	flushText();
	return nodes;
}

function isBlockStart(line: string) {
	return (
		/^(#{1,6})\s+/.test(line) ||
		/^```/.test(line) ||
		/^\s*>/.test(line) ||
		/^\s*[-*+]\s+/.test(line) ||
		/^\s*\d+[.)]\s+/.test(line) ||
		/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)
	);
}

function parseBlocks(lines: string[]): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (!line.trim()) {
			index += 1;
			continue;
		}

		const fence = /^```([\w-]*)\s*$/.exec(line);
		if (fence) {
			const code: string[] = [];
			index += 1;
			while (index < lines.length && !/^```\s*$/.test(lines[index])) {
				code.push(lines[index]);
				index += 1;
			}
			if (index < lines.length) index += 1;
			blocks.push({ type: 'code', value: code.join('\n') });
			continue;
		}

		const heading = /^(#{1,6})\s+(.*)$/.exec(line);
		if (heading) {
			blocks.push({
				type: 'heading',
				level: Math.min(heading[1].length + 2, 6),
				children: parseInline(heading[2].trim())
			});
			index += 1;
			continue;
		}

		if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
			blocks.push({ type: 'hr' });
			index += 1;
			continue;
		}

		if (/^\s*>/.test(line)) {
			const quote: string[] = [];
			while (index < lines.length && /^\s*>/.test(lines[index])) {
				quote.push(lines[index].replace(/^\s*>\s?/, ''));
				index += 1;
			}
			blocks.push({ type: 'blockquote', children: parseInline(quote.join('\n')) });
			continue;
		}

		if (/^\s*[-*+]\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
				items.push(lines[index].replace(/^\s*[-*+]\s+/, ''));
				index += 1;
			}
			blocks.push({ type: 'list', ordered: false, items: items.map(parseInline) });
			continue;
		}

		if (/^\s*\d+[.)]\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
				items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ''));
				index += 1;
			}
			blocks.push({ type: 'list', ordered: true, items: items.map(parseInline) });
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
			paragraph.push(lines[index]);
			index += 1;
		}

		// Defensive: if a line looked like a block start but was not consumed
		// above, step past it rather than looping forever.
		if (paragraph.length === 0) {
			paragraph.push(line);
			index += 1;
		}

		blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
	}

	return blocks;
}

export function parseMarkdown(source: string): MarkdownBlock[] {
	const normalized = source.replace(/\r\n?/g, '\n').trim();
	if (!normalized) return [];
	return parseBlocks(normalized.split('\n'));
}

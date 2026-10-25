import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 12;

export type PdfTextFailure = 'not_pdf' | 'password' | 'read' | 'too_large';

export class PdfTextError extends Error {
	reason: PdfTextFailure;

	constructor(reason: PdfTextFailure) {
		super(reason);
		this.reason = reason;
	}
}

export type PdfText = {
	text: string;
	title: string | undefined;
	pageCount: number;
	totalPages: number;
};

/** Rebuild lines from positioned text runs, top to bottom, left to right. */
function layoutText(items: unknown[]): string {
	const pieces: { x: number; y: number; text: string }[] = [];

	for (const item of items) {
		if (!item || typeof item !== 'object') continue;

		const { str, transform } = item as { str?: unknown; transform?: unknown };
		if (typeof str !== 'string' || !str.trim()) continue;
		if (!Array.isArray(transform) || typeof transform[4] !== 'number') continue;

		pieces.push({ x: transform[4], y: transform[5], text: str.replace(/\s+/g, ' ') });
	}

	pieces.sort((a, b) => b.y - a.y || a.x - b.x);

	const rows: { y: number; text: string }[] = [];
	for (const piece of pieces) {
		const row = rows.at(-1);
		// Runs sharing a baseline within a few points belong to one line.
		if (row && Math.abs(row.y - piece.y) < 3) row.text += ` ${piece.text}`;
		else rows.push({ y: piece.y, text: piece.text });
	}

	return rows.map((row) => row.text.replace(/\s+/g, ' ').trim()).join('\n');
}

/**
 * Read the text layer of a PDF entirely in the browser. Nothing is uploaded,
 * and pdf.js itself is loaded on demand so ordinary page views stay light.
 */
export async function extractPdfText(file: File): Promise<PdfText> {
	if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
		throw new PdfTextError('not_pdf');
	}
	if (file.size > MAX_PDF_BYTES) throw new PdfTextError('too_large');

	let task: PDFDocumentLoadingTask | null = null;

	try {
		const pdfjs = await import('pdfjs-dist');
		pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

		task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
		const doc = await task.promise;

		const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
		const pages: string[] = [];

		for (let index = 1; index <= pageCount; index += 1) {
			const page = await doc.getPage(index);
			const content = await page.getTextContent();
			pages.push(layoutText(content.items));
			page.cleanup();
		}

		let title: string | undefined;
		try {
			const metadata = await doc.getMetadata();
			title = (metadata.info as { Title?: string }).Title;
		} catch {
			// A missing title just means the first visible line is used.
		}

		return { text: pages.join('\n\n'), title, pageCount, totalPages: doc.numPages };
	} catch (error) {
		if (error instanceof PdfTextError) throw error;
		if (error instanceof Error && error.name === 'PasswordException') {
			throw new PdfTextError('password');
		}
		throw new PdfTextError('read');
	} finally {
		try {
			await task?.destroy();
		} catch {
			// A worker that is already gone needs no further cleanup.
		}
	}
}

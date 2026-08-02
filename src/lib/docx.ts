import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";

/**
 * Server-only helper for building .docx buffers from markdown text.
 * Kept out of the client bundle — importing `docx` in the browser breaks
 * under Turbopack, so all DOCX generation happens in route handlers.
 */

export const maxExportLength = 100 * 1024; // 100 KB sanity limit per export

/** Strips lightweight markdown so the exported DOCX contains clean plain text. */
export function stripMarkdownForDocx(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .trim();
}

/**
 * Builds a DOCX buffer from markdown content with a dated header.
 * Paragraphs are split on blank lines so the document reads naturally.
 */
export async function buildDocxBuffer(markdown: string): Promise<Buffer> {
  const paragraphs = stripMarkdownForDocx(markdown)
    .split(/\n{2,}/)
    .filter((block) => block.trim().length > 0)
    .map(
      (block) =>
        new Paragraph({
          spacing: { after: 240, line: 320 },
          children: [new TextRun({ text: block, size: 22 })],
        })
    );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 360 },
            children: [new TextRun({ text: new Date().toLocaleDateString(), size: 22 })],
          }),
          ...paragraphs,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/** Sanitizes a user-provided filename so it can never escape the header. */
export function sanitizeExportFilename(filename: string): string {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.{2,}/g, ".");
  const base = cleaned.endsWith(".docx") ? cleaned : `${cleaned}.docx`;
  return base.length > 120 ? `${base.slice(0, 116)}.docx` : base;
}

import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { NextResponse } from 'next/server';

/**
 * Strips lightweight markdown so the exported DOCX contains clean plain text.
 * Kept server-side so the client bundle never loads the `docx` library.
 */
function stripMarkdownForDocx(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .trim();
}

const maxMarkdownLength = 100 * 1024; // 100 KB sanity limit for exported letters

/**
 * POST /api/cover-letter/export
 * Body: { markdown: string }
 * Returns: hirefit-cover-letter.docx as an attachment.
 */
export async function POST(request: Request) {
  try {
    let body: { markdown?: unknown };
    try {
      body = (await request.json()) as { markdown?: unknown };
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const markdown = typeof body?.markdown === 'string' ? body.markdown : '';

    if (!markdown.trim()) {
      return NextResponse.json({ error: 'Missing cover letter content.' }, { status: 400 });
    }

    if (markdown.length > maxMarkdownLength) {
      return NextResponse.json({ error: 'Cover letter content is too large.' }, { status: 413 });
    }

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

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="hirefit-cover-letter.docx"',
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not create the DOCX file. Please try again.' },
      { status: 500 }
    );
  }
}

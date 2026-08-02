import { NextResponse } from "next/server";
import {
  buildDocxBuffer,
  maxExportLength,
  sanitizeExportFilename,
} from "@/lib/docx";

const docxContentType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * POST /api/reports/export
 * Body: { markdown: string, filename?: string }
 * Returns: <filename>.docx as an attachment.
 * Shared by the Export Reports module; generates on the server because the
 * `docx` library cannot be bundled for the browser under Turbopack.
 */
export async function POST(request: Request) {
  try {
    let body: { markdown?: unknown; filename?: unknown };
    try {
      body = (await request.json()) as { markdown?: unknown; filename?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const markdown = typeof body?.markdown === "string" ? body.markdown : "";
    if (!markdown.trim()) {
      return NextResponse.json({ error: "Missing report content." }, { status: 400 });
    }
    if (markdown.length > maxExportLength) {
      return NextResponse.json({ error: "Report content is too large." }, { status: 413 });
    }

    const filename =
      typeof body?.filename === "string" && body.filename.trim()
        ? sanitizeExportFilename(body.filename.trim())
        : "hirefit-career-report.docx";

    const buffer = await buildDocxBuffer(markdown);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": docxContentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not create the DOCX file. Please try again." },
      { status: 500 }
    );
  }
}

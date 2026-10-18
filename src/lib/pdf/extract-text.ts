import { LIMITS } from "@/lib/input";

export type PdfResult = { ok: true; text: string } | { ok: false; reason: "too_large" | "encrypted" | "no_text" | "unreadable" };

const MIN_TEXT_CHARS = 50;

/** Browser only. Reads the text layer of a PDF; the file never leaves the device. */
export async function extractPdfText(file: File): Promise<PdfResult> {
  if (file.size > LIMITS.pdfBytes) return { ok: false, reason: "too_large" };

  // Loaded on demand so the PDF library is only downloaded when someone uploads a file.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  let loadingTask: ReturnType<typeof pdfjs.getDocument> | undefined;
  try {
    loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const doc = await loadingTask.promise;
    let text = "";
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      text += "\n";
    }
    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) return { ok: false, reason: "no_text" };
    return { ok: true, text };
  } catch (error) {
    if ((error as { name?: string })?.name === "PasswordException") return { ok: false, reason: "encrypted" };
    return { ok: false, reason: "unreadable" };
  } finally {
    await loadingTask?.destroy();
  }
}

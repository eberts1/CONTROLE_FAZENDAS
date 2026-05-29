import { BadRequestException } from '@nestjs/common';

let pdfjsModule: typeof import('pdfjs-dist/legacy/build/pdf.mjs') | null = null;

async function getPdfJs() {
  if (!pdfjsModule) {
    pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsModule;
}

export async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  const pdfjs = await getPdfJs();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: password ?? '',
    useSystemFonts: true,
    disableFontFace: true,
  });

  let document: import('pdfjs-dist').PDFDocumentProxy;
  try {
    document = await loadingTask.promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao abrir PDF';
    if (/password/i.test(message)) {
      throw new BadRequestException('PDF protegido por senha. Informe a senha correta.');
    }
    throw new BadRequestException(`Não foi possível ler o PDF: ${message}`);
  }

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = new Map<number, string[]>();

    for (const item of content.items) {
      if (!('str' in item) || !item.str?.trim()) continue;
      const y = Math.round((item.transform?.[5] ?? 0) as number);
      const bucket = lines.get(y) ?? [];
      bucket.push(item.str);
      lines.set(y, bucket);
    }

    const pageText = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(' ').trim())
      .filter(Boolean)
      .join('\n');

    pages.push(pageText);
  }

  return pages.join('\n');
}

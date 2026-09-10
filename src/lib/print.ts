type PrintableDocument = Pick<Document, 'fonts'>

/** Waits for the rendered typeface before opening the browser's native print dialog. */
export async function printAfterFontsReady(
  document: PrintableDocument = window.document,
  print: () => void = window.print,
): Promise<void> {
  await document.fonts?.ready
  print()
}

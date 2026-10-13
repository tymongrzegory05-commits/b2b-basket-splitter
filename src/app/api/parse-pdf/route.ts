import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Brak pliku PDF" }, { status: 400 });
  }

  const parser = new PDFParse({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  try {
    const parsed = await parser.getText();
    return Response.json({
      text: parsed.text ?? "",
      pages: parsed.total ?? 0,
    });
  } catch {
    return Response.json(
      { error: "Nie udało się odczytać PDF" },
      { status: 422 },
    );
  } finally {
    await parser.destroy();
  }
}

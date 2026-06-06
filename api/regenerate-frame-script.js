import { cleanLine, extractGeminiText, geminiGenerate, getGeminiKey, parseJsonObject, readJson, sendJson } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  try {
    const apiKey = getGeminiKey();
    if (!apiKey) return sendJson(res, 400, { ok: false, error: "Put GEMINI_API_KEY in Vercel environment variables." });
    const body = readJson(req);
    const frames = body.frames || [];
    const languageName = body.language === "malay" ? "Malay" : "English";
    const prompt = [
      "Rewrite exactly one narration line for a short image-to-video story.",
      'Return ONLY valid JSON like {"line":"string"}.',
      `Write in ${languageName} only.`,
      "Keep it one complete spoken sentence, 60 characters or fewer.",
      `Frame to rewrite: ${Number(body.index || 0) + 1} of ${frames.length || 4}`,
      `Title: ${body.title || ""}`,
      `Description: ${body.description || ""}`,
      `Current script: ${frames.join(" / ")}`,
    ].join("\n");
    const data = await geminiGenerate(process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash", {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8 },
    }, apiKey);
    const parsed = parseJsonObject(extractGeminiText(data));
    sendJson(res, 200, { ok: true, line: cleanLine(parsed.line || "") });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

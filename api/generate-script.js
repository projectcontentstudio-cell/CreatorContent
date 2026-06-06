import { cleanLine, extractGeminiText, geminiGenerate, getGeminiKey, parseJsonObject, readJson, sendJson } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  try {
    const apiKey = getGeminiKey();
    if (!apiKey) return sendJson(res, 400, { ok: false, error: "Put GEMINI_API_KEY in Vercel environment variables." });
    const body = readJson(req);
    const frameCount = Number(body.frameCount || 4);
    const languageName = body.language === "malay" ? "Malay" : "English";
    const title = String(body.title || "A 20 Second Story").trim();
    const description = String(body.description || "").trim();
    const niche = String(body.niche || "General").trim();
    const prompt = [
      `Create a short image-to-video narration for exactly ${frameCount} frames.`,
      `Return ONLY valid JSON like {"title":"string","description":"string","frames":["line1","line2","line3","line4"]}.`,
      `Write every narration line in ${languageName} only.`,
      `Each line must be 60 characters or fewer and complete.`,
      `Use a continuous arc across all ${frameCount} frames: hook, setup, discovery, escalation, choice, payoff, ending.`,
      `Keep same main character and visual setting across all frames.`,
      `No numbering inside subtitles. No markdown.`,
      `Selected niche: ${niche}`,
      `User title: ${title}`,
      `User description: ${description || "Create a clear description from the title and niche."}`,
    ].join("\n");
    const data = await geminiGenerate(process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash", {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8 },
    }, apiKey);
    const parsed = parseJsonObject(extractGeminiText(data));
    const frames = (parsed.frames || []).slice(0, frameCount);
    if (frames.length !== frameCount) throw new Error(`Gemini did not return exactly ${frameCount} frame subtitles.`);
    sendJson(res, 200, {
      ok: true,
      title,
      description: description || parsed.description || title,
      frames: frames.map((line) => cleanLine(line)),
      usage: data.usageMetadata,
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

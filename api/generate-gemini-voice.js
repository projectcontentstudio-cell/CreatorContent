import { extractGeminiText, geminiGenerate, getGeminiKey, pcmToWavBase64, readJson, sendJson } from "./_utils.js";

function extractAudio(data) {
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const inlineData = part.inlineData || part.inline_data;
      if (inlineData?.data) return inlineData.data;
    }
  }
  extractGeminiText(data);
  throw new Error("Gemini did not return audio data.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  try {
    const apiKey = getGeminiKey();
    if (!apiKey) return sendJson(res, 400, { ok: false, error: "Put GEMINI_API_KEY in Vercel environment variables." });
    const body = readJson(req);
    const text = String(body.text || "").trim();
    if (!text) return sendJson(res, 400, { ok: false, error: "Voice text is empty." });
    const voiceName = body.voiceName || process.env.GEMINI_TTS_VOICE || "Zephyr";
    const tone = body.style === "bright" ? "clear energetic narration" : body.style === "calm" ? "calm gentle storytelling" : "warm cinematic storytelling";
    const data = await geminiGenerate(process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts", {
      contents: [{ parts: [{ text: `Say in ${tone}. Read exactly this line and do not add words: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }, apiKey);
    sendJson(res, 200, {
      ok: true,
      mime: "audio/wav",
      b64: pcmToWavBase64(extractAudio(data)),
      voiceId: voiceName,
      modelId: process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts",
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

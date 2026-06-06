import { getElevenLabsKey, getGeminiKey, sendJson } from "./_utils.js";

export default function handler(req, res) {
  sendJson(res, 200, {
    ok: true,
    hasGeminiKey: Boolean(getGeminiKey()),
    hasElevenLabsKey: Boolean(getElevenLabsKey()),
    geminiTextModel: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
    geminiImageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
    geminiTtsModel: process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts",
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini",
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "",
  });
}

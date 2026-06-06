import { bufferToBase64, getElevenLabsKey, readJson, sendJson } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  try {
    const apiKey = getElevenLabsKey();
    if (!apiKey) return sendJson(res, 400, { ok: false, error: "Put ELEVENLABS_API_KEY in Vercel environment variables." });
    const body = readJson(req);
    const text = String(body.text || "").trim();
    if (!text) return sendJson(res, 400, { ok: false, error: "Voice text is empty." });
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
    const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
    const style = body.style || "warm";
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: style === "bright" ? 0.38 : style === "calm" ? 0.62 : 0.5,
          similarity_boost: 0.75,
          style: style === "bright" ? 0.32 : style === "calm" ? 0.05 : 0.12,
          use_speaker_boost: true,
        },
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    sendJson(res, 200, {
      ok: true,
      mime: "audio/mpeg",
      b64: bufferToBase64(await response.arrayBuffer()),
      voiceId,
      modelId,
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

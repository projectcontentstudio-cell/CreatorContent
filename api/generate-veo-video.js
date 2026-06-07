import { getGeminiKey, readJson, sendJson } from "./_utils.js";

function cleanBase64(value = "") {
  return String(value || "").replace(/^data:[^,]+,/, "").trim();
}

function buildVeoPrompt(body) {
  return [
    "Create an 8-second vertical affiliate product video with natural motion.",
    `Title: ${body.title || "Affiliate product video"}.`,
    `Product direction: ${body.description || "Show product benefit and desire."}`,
    "Make the product clear and attractive. Show hands using it or a lifestyle scene if suitable.",
    "Camera: smooth push-in, small parallax, natural product reveal.",
    "Style: TikTok-ready, bright, clean, realistic, no text overlays, no watermark.",
    "Audio/dialogue can be natural, but do not mention unsupported claims."
  ].join("\n");
}

async function pollOperation(apiKey, operationName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const response = await fetch(url, { headers: { "x-goog-api-key": apiKey } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `Veo operation check failed with ${response.status}.`);
    if (data.done) return data;
  }
  return null;
}

function extractVideoUrl(operation) {
  const samples = operation?.response?.generateVideoResponse?.generatedSamples || [];
  return samples[0]?.video?.uri || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  try {
    const apiKey = getGeminiKey();
    if (!apiKey) return sendJson(res, 400, { ok: false, error: "Put GEMINI_API_KEY in Vercel environment variables for Veo." });
    const body = readJson(req);
    const image = cleanBase64(body.image);
    const model = process.env.VEO_MODEL || "veo-3.1-fast-generate-preview";
    const instance = { prompt: buildVeoPrompt(body) };
    if (image) {
      instance.image = {
        bytesBase64Encoded: image,
        mimeType: body.mime || "image/png",
      };
    }
    const payload = {
      instances: [instance],
      parameters: {
        aspectRatio: body.aspectRatio || "9:16",
        durationSeconds: 8,
        generateAudio: true,
        sampleCount: 1,
      },
    };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const operation = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(operation.error?.message || `Veo request failed with ${response.status}.`);
    const operationName = operation.name || "";
    const completed = operationName ? await pollOperation(apiKey, operationName) : null;
    const videoUrl = extractVideoUrl(completed);
    sendJson(res, 200, { ok: true, operationName, done: Boolean(completed?.done), videoUrl });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

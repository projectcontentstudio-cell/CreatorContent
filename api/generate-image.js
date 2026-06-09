import { getGeminiKey, getOpenAIKey, readJson, sendJson } from "./_utils.js";

function cleanBase64(value = "") {
  return String(value || "").replace(/^data:[^,]+,/, "").trim();
}

function imageSize(format) {
  return format === "landscape" ? "1536x1024" : "1024x1536";
}

function quality(value) {
  return ["low", "medium", "high"].includes(value) ? value : "medium";
}

function buildPrompt(body) {
  const index = Number(body.index || 0);
  const subtitles = Array.isArray(body.subtitles) ? body.subtitles : [];
  const beat = subtitles[index] || body.description || body.idea || body.title || "affiliate product scene";
  const mode = body.mode === "affiliate" ? "Affiliate product video" : "Storytelling video";
  const aspect = body.format === "landscape" ? "16:9 landscape" : "9:16 vertical portrait";
  const affiliateScene = index === 0
    ? [
        "Scene role: Problem scene.",
        "Show a relatable daily pain before using the product. Keep it natural, not a hard sell.",
        "The product can appear subtly if it helps preserve reference continuity, but the pain must be clear."
      ].join(" ")
    : [
        "Scene role: Solution scene.",
        "Show the uploaded product clearly as the simple way out of the problem.",
        "Make the product central, desirable, and accurate for product shape, color, packaging, logo, and label."
      ].join(" ");
  return [
    `Create image ${index + 1} for a ${mode}.`,
    `Format: ${aspect}.`,
    `Title: ${body.title || "Untitled"}.`,
    `Scene narration context, not visible text: ${beat}`,
    `Direction: ${body.idea || body.description || ""}`,
    body.mode === "affiliate"
      ? `${affiliateScene} Preserve exact product identity from the uploaded reference when visible. No fake brand claims.`
      : "Keep one continuous character, setting, lighting, and visual style across scenes.",
    "Cinematic high-quality frame, no subtitles, no captions, no watermark, no UI, no extra logos beyond the real product label."
  ].join("\n");
}

async function generateOpenAIImage(apiKey, body, prompt, referenceImage) {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
  if (referenceImage) {
    const form = new FormData();
    form.set("model", model);
    form.set("prompt", [
      "Use the uploaded product/reference image as the visual identity reference.",
      "Preserve product shape, color, packaging, logo, and label when visible, but create a new selling scene.",
      prompt
    ].join("\n"));
    form.set("n", "1");
    form.set("quality", quality(body.quality));
    form.set("size", body.size || imageSize(body.format));
    form.set("output_format", "png");
    form.set("image", new Blob([Buffer.from(referenceImage, "base64")], { type: body.referenceMime || "image/png" }), "reference.png");
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `OpenAI image edit failed with ${response.status}.`);
    return data.data?.[0]?.b64_json;
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      quality: quality(body.quality),
      size: body.size || imageSize(body.format),
      output_format: "png",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `OpenAI image generation failed with ${response.status}.`);
  return data.data?.[0]?.b64_json;
}

function extractGeminiImage(data) {
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.data) return { b64: inline.data, mime: inline.mimeType || inline.mime_type || "image/png" };
    }
  }
  throw new Error("Gemini did not return image data.");
}

async function generateGeminiImage(apiKey, body, prompt, referenceImage) {
  const parts = [{ text: `${prompt}\n\nOutput one ${body.format === "landscape" ? "16:9 landscape" : "9:16 portrait"} image.` }];
  if (referenceImage) {
    parts.push({
      inline_data: {
        mime_type: body.referenceMime || "image/png",
        data: referenceImage,
      },
    });
  }
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Gemini image failed with ${response.status}.`);
  return extractGeminiImage(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  try {
    const body = readJson(req);
    const provider = body.provider === "google" ? "google" : "openai";
    const referenceImage = cleanBase64(body.referenceImage);
    const prompt = buildPrompt(body);
    if (provider === "google") {
      const apiKey = getGeminiKey();
      if (!apiKey) return sendJson(res, 400, { ok: false, error: "Put GEMINI_API_KEY in Vercel environment variables." });
      const image = await generateGeminiImage(apiKey, body, prompt, referenceImage);
      return sendJson(res, 200, { ok: true, image: { name: `AI frame ${Number(body.index || 0) + 1}`, ...image, prompt, usedReference: Boolean(referenceImage) } });
    }
    const apiKey = getOpenAIKey();
    if (!apiKey) return sendJson(res, 400, { ok: false, error: "Put OPENAI_API_KEY in Vercel environment variables." });
    const b64 = await generateOpenAIImage(apiKey, body, prompt, referenceImage);
    if (!b64) throw new Error("OpenAI did not return image data.");
    return sendJson(res, 200, {
      ok: true,
      image: { name: `AI frame ${Number(body.index || 0) + 1}`, mime: "image/png", b64, prompt, usedReference: Boolean(referenceImage) },
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

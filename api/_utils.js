export function readJson(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(payload));
}

export function getGeminiKey() {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  return key && !key.startsWith("replace-with") ? key : "";
}

export function getElevenLabsKey() {
  const key = (process.env.ELEVENLABS_API_KEY || "").trim();
  return key && !key.startsWith("replace-with") ? key : "";
}

export function cleanLine(text, max = 60) {
  let line = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+dengan(?:\s+penuh)?(?:\s+harapan)?(?:\s+baru)?\.?$/i, ".")
    .replace(/\s+with(?:\s+quiet)?(?:\s+hope)?(?:\s+again)?\.?$/i, ".")
    .trim();
  if (!/[.!?]$/.test(line)) line += ".";
  if (line.length <= max) return line;
  const words = line.replace(/[.!?]+$/g, "").split(" ");
  let result = "";
  for (const word of words) {
    const next = result ? `${result} ${word}` : word;
    if (`${next}.`.length <= max) result = next;
  }
  return `${result || line.slice(0, max - 1).trim()}.`;
}

export function extractGeminiText(data) {
  const chunks = [];
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.text) chunks.push(part.text);
    }
  }
  const text = chunks.join("\n").trim();
  if (!text) throw new Error("No text returned from Gemini.");
  return text;
}

export function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("AI did not return JSON.");
    return JSON.parse(text.slice(start, end + 1));
  }
}

export function bufferToBase64(buffer) {
  return Buffer.from(buffer).toString("base64");
}

export function pcmToWavBase64(pcmBase64, sampleRate = 24000) {
  const pcm = Buffer.from(pcmBase64, "base64");
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

export async function geminiGenerate(model, payload, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini request failed with ${response.status}.`);
  }
  return data;
}

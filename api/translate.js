/** Concatenate text from Gemini generateContent response. */
function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("\n\n");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { patientInfo, consultReason } = req.body;

  if (!patientInfo || !consultReason) {
    return res.status(400).json({ error: "Missing input" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) env var");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const prompt = `
Patient Info: ${patientInfo}
Reason: ${consultReason}

1. Rewrite using professional medical jargon
2. Translate into plain, patient-friendly language
Return as plain text with no mardown fomatting
`;

  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.error?.message || data?.error?.status || "Gemini request failed";
      console.error("Gemini error:", data?.error ?? data);
      return res.status(response.status >= 400 ? response.status : 502).json({
        error: msg,
      });
    }

    const text = extractGeminiText(data);

    if (!text) {
      const block = data?.promptFeedback?.blockReason;
      const finish = data?.candidates?.[0]?.finishReason;
      console.error("Empty Gemini output", { block, finish, data });
      return res.status(502).json({
        error:
          "Model returned no text (safety block or empty response). Check server logs.",
      });
    }

    res.status(200).json({ output: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to translate" });
  }
}

/** Pull assistant text from POST /v1/responses JSON (raw REST has no output_text helper). */
function extractResponsesOutputText(data) {
  const out = data?.output;
  if (!Array.isArray(out)) return "";

  const parts = [];
  for (const item of out) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const block of item.content) {
      if (block.type === "output_text" && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }
  return parts.join("\n\n");
}

export default async function handler(req, res) {
  // ✅ CORS headers so Webflow can call it
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { patientInfo, consultReason } = req.body;

  if (!patientInfo || !consultReason) {
    return res.status(400).json({ error: "Missing input" });
  }

  const prompt = `
Patient Info: ${patientInfo}
Reason: ${consultReason}

1. Rewrite using professional medical jargon
2. Translate into plain, patient-friendly language
Return as plain text or JSON
`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.error?.message ||
        data?.error?.code ||
        "OpenAI request failed";
      console.error("OpenAI error:", data?.error ?? data);
      return res.status(response.status).json({ error: msg });
    }

    // Responses API: do not assume text is at output[0] (reasoning/tool items may come first).
    // Walk all message items and aggregate output_text blocks.
    const text = extractResponsesOutputText(data);

    if (!text) {
      console.error("Empty model output; raw keys:", Object.keys(data), "output:", data.output);
      return res.status(502).json({
        error: "Model returned no text. Check server logs for the raw response shape.",
      });
    }

    res.status(200).json({ output: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to translate" });
  }
}

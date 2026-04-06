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

    // Safely extract output text
    const text = data.output?.[0]?.content?.[0]?.text || "";

    // Return a single field, compatible with simplified result div
    res.status(200).json({ output: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to translate" });
  }
}

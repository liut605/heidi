export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Only block AFTER handling OPTIONS
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { patientInfo, consultReason } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Patient Info: ${patientInfo}
Reason: ${consultReason}`,
      }),
    });

    const data = await response.json();
    const text = data.output?.[0]?.content?.[0]?.text || "";

    return res.status(200).json({ output: text });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to translate" });
  }
}

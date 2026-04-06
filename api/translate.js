export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { patientInfo, consultReason } = req.body;

  const prompt = `
  Patient Info: ${patientInfo}
  Reason: ${consultReason}

  1. Rewrite using professional medical jargon
  2. Translate into plain, patient-friendly language
  Return JSON
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
    const text = data.output[0].content[0].text;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to translate" });
  }
}

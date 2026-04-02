export default async function handler(req, res) {
  try {
    const { patientInfo, consultationReason } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: `
You translate clinical notes into patient-friendly language.

Extract:
1. Key medical jargon terms
2. Simple explanations
3. A short patient-friendly summary

Patient Info: ${patientInfo}
Notes: ${consultationReason}

Return JSON ONLY:
{
  "terms": [{"term": "", "explanation": ""}],
  "translation": ""
}
        `,
      }),
    });

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
}

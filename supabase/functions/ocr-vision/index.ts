import { corsHeaders } from "./cors.ts";

interface OcrRequest {
  image: string;       // base64-encoded image data (no data: prefix)
  mimeType: string;    // e.g. "image/png", "image/jpeg"
  language: "en" | "ml";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { image, mimeType, language } = (await req.json()) as OcrRequest;

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing image data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: "GEMINI_API_KEY is not configured. Set it as a Supabase edge function secret.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = language === "ml"
      ? "Extract all text visible in this image. The text may be handwritten or printed, in Malayalam or English. Return ONLY the exact extracted text, preserving the original language. Do not translate. Do not add any commentary or explanation."
      : "Extract all text visible in this image. The text may be handwritten or printed, in English. Return ONLY the exact extracted text. Do not add any commentary or explanation.";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || "image/png", data: image } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${geminiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiResponse.json();
    const extractedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ configured: true, text: extractedText.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ocr-vision error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

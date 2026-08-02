import { corsHeaders } from "./cors.ts";

interface SolveRequest {
  question: string;
  language: "en" | "ml";
  classLevel?: string;
  subject?: string;
  chapter?: string;
  board?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { question, language, classLevel, subject, chapter, board } = (await req.json()) as SolveRequest;

    if (!question || !question.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing question text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: "GEMINI_API_KEY is not configured.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const langName = language === "ml" ? "Malayalam" : "English";
    const classInfo = classLevel ? `The student is in ${classLevel}` : "The student is in Class 9";
    const subjectInfo = subject ? `, studying ${subject}` : "";
    const chapterInfo = chapter ? `, currently on the chapter "${chapter}"` : "";
    const boardInfo = board ? ` (${board} board)` : "";

    const systemPrompt = `You are an expert tutor for Indian school students. ${classInfo}${subjectInfo}${chapterInfo}${boardInfo}.

A student has uploaded a question. Answer it clearly and correctly.

Rules:
1. Respond entirely in ${langName}.
2. Match the answer's depth to the student's class level — do not use concepts above their grade.
3. If the question is numerical (math/physics), provide a step-by-step solution with: Given, Formula, Substitution, Calculation, Final Answer, and a short explanation.
4. If the question is conceptual/theory, provide: a direct answer, a simple explanation, important points, and an exam-ready summary.
5. If the question is a chemistry equation, show the balanced equation and explain it.
6. Preserve mathematical symbols, superscripts, and subscripts where possible.
7. Do NOT describe or analyze any image. Just answer the question text provided.
8. Do NOT ask follow-up questions. Give a complete answer.

Format your response as JSON with this exact structure:
{
  "solved": true,
  "subject": "best guess subject or empty",
  "chapter": "best guess chapter or empty",
  "answer": "the final answer in one or two sentences",
  "explanation": "detailed explanation",
  "steps": [
    {"label": "step label", "content": "step content"}
  ],
  "isConceptual": true or false
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }, { text: `Question: ${question}` }] },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("[Solve] Gemini API error:", geminiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${geminiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: {
      solved: boolean;
      subject?: string;
      chapter?: string;
      answer: string;
      explanation: string;
      steps: { label: string; content: string }[];
      isConceptual?: boolean;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      // If JSON parsing fails, treat the raw text as a plain explanation
      parsed = {
        solved: true,
        answer: rawText.split(".")[0] + ".",
        explanation: rawText,
        steps: [{ label: "Answer", content: rawText }],
        isConceptual: true,
      };
    }

    console.log("[Solve] AI solved question:", question.substring(0, 60));
    console.log("[Solve] Answer:", parsed.answer?.substring(0, 80));

    return new Response(
      JSON.stringify({ configured: true, ...parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[Solve] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

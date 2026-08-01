import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-user-id",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { studentId, userMessage, context } = await req.json();

    if (!studentId || !userMessage) {
      return new Response(JSON.stringify({ error: "Missing studentId or userMessage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the student's assigned mentor
    const { data: assignment } = await supabase
      .from("mentor_assignments")
      .select("mentor_id, mentor_id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();

    if (!assignment) {
      return new Response(JSON.stringify({ error: "No active mentor assignment" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a context-aware mentor reply based on the student's message
    const mentorReply = generateMentorReply(userMessage, context);

    // Save the mentor's reply
    await supabase.from("mentor_messages").insert({
      student_id: studentId,
      mentor_id: assignment.mentor_id,
      sender: "mentor",
      message: mentorReply.message,
    });

    // If the message indicates difficulty, create a follow-up
    if (mentorReply.createFollowUp) {
      await supabase.from("mentor_followups").insert({
        student_id: studentId,
        mentor_id: assignment.mentor_id,
        guidance: mentorReply.followUpGuidance || "",
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        completed: false,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      reply: mentorReply.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateMentorReply(
  userMessage: string,
  context?: { subject?: string; chapter?: string; topic?: string; recentScore?: number; conceptGaps?: string[] }
): { message: string; createFollowUp: boolean; followUpGuidance?: string } {
  const lower = userMessage.toLowerCase();

  // Academic difficulty
  if (lower.includes("wrong") || lower.includes("difficult") || lower.includes("hard") || lower.includes("struggling") || lower.includes("stuck")) {
    const topic = context?.topic || context?.chapter || "this topic";
    return {
      message: `I can see you're having trouble with ${topic}. That's completely normal — it's a tricky concept. Let me suggest a different approach:\n\n1. First, write down what you DO know about ${topic}\n2. Then identify the specific part that's confusing you\n3. Try a simpler example before attempting the harder ones\n\nSend me what you know so far and I'll help you find the gap. You've got this! 💪`,
      createFollowUp: true,
      followUpGuidance: `Yesterday you were struggling with ${topic}. Try these 3 questions today and message me if you're still stuck.`,
    };
  }

  // Study planning
  if (lower.includes("study") || lower.includes("plan") || lower.includes("schedule") || lower.includes("time management")) {
    return {
      message: `Great question! Here's a study plan that works well:\n\n1. Study in 25-minute focused blocks (Pomodoro technique)\n2. Take a 5-minute break between blocks\n3. Review what you learned at the end of each session\n4. Do practice questions, not just reading\n\nFor this week, I'd suggest focusing on ${context?.chapter || "your current chapter"} for 2 blocks per day. Would you like me to help you create a specific timetable?`,
      createFollowUp: false,
    };
  }

  // Exam preparation
  if (lower.includes("exam") || lower.includes("test") || lower.includes("score") || lower.includes("mock")) {
    const score = context?.recentScore;
    let scoreComment = "";
    if (score !== undefined) {
      if (score >= 7) scoreComment = `Your recent mock test score of ${score}/10 shows you're on the right track! `;
      else if (score >= 5) scoreComment = `Your recent score of ${score}/10 shows potential. `;
      else scoreComment = `I saw your recent score of ${score}/10 — let's work on improving that together. `;
    }
    return {
      message: `${scoreComment}For exam preparation:\n\n1. Focus on understanding concepts, not memorizing\n2. Practice with past papers and mock tests\n3. Review your mistakes — that's where the most learning happens\n4. Don't skip the easy topics — they're free marks!\n\nWhich topics do you feel least confident about?`,
      createFollowUp: false,
    };
  }

  // Motivation
  if (lower.includes("motivation") || lower.includes("discouraged") || lower.includes("give up") || lower.includes("tired") || lower.includes("can't do")) {
    return {
      message: `I hear you, and I want you to know — every student goes through this. The fact that you're here asking for help shows you care about your learning. That's already a huge step.\n\nRemember: progress isn't always a straight line. Some days are harder than others, and that's okay. You don't have to be perfect — you just have to keep going.\n\nWhat's one small thing you can do today to move forward? Even 15 minutes counts. 💪`,
      createFollowUp: false,
    };
  }

  // Guidance / what to study next
  if (lower.includes("guidance") || lower.includes("what should i") || lower.includes("next") || lower.includes("don't know what")) {
    const gaps = context?.conceptGaps;
    let gapAdvice = "";
    if (gaps && gaps.length > 0) {
      gapAdvice = `\n\nBased on your recent activity, I'd suggest reviewing: ${gaps.slice(0, 3).join(", ")}. These are areas where a few more practice questions would help a lot.`;
    }
    return {
      message: `Let's figure out your next step together.${gapAdvice}\n\nFor now, I'd recommend:\n1. Review your current chapter: ${context?.chapter || "your latest topic"}\n2. Take a short mock test to check your understanding\n3. Use the AI Tutor to clear any doubts immediately\n\nWhat sounds most helpful to you right now?`,
      createFollowUp: false,
    };
  }

  // Don't understand
  if (lower.includes("don't understand") || lower.includes("confused") || lower.includes("confusing") || lower.includes("don't get it")) {
    return {
      message: `That's okay — confusion is actually the first step toward understanding! Let's break it down together.\n\nCan you tell me specifically which part is confusing? Is it:\n- The concept itself?\n- A formula or calculation?\n- How to apply it to problems?\n\nOnce I know where the confusion is, I can guide you through it step by step. You're closer to understanding than you think! 😊`,
      createFollowUp: true,
      followUpGuidance: `You mentioned confusion with ${context?.topic || context?.chapter || "a topic"}. Try reviewing the basics and attempt 2 practice questions.`,
    };
  }

  // Greeting
  if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
    return {
      message: `Hi there! 👋 I'm your Personal Mentor. I'm here to support you throughout your learning journey.\n\nI can see you're studying ${context?.subject || "your subjects"}${context?.chapter ? ` — currently on ${context.chapter}` : ""}. How are things going? Is there anything specific you'd like help with today?`,
      createFollowUp: false,
    };
  }

  // Default
  return {
    message: `Thanks for sharing that with me. I'm here to help you with academic doubts, study planning, exam preparation, motivation, or anything else related to your learning.\n\nCould you tell me a bit more about what you need? I can see your learning context — you're on ${context?.chapter || "a topic"} in ${context?.subject || "your subject"}. Let's work through this together!`,
    createFollowUp: false,
  };
}

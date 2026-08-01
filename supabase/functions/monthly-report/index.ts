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
    const emailApiKey = Deno.env.get("EMAIL_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // ---- generate_report ----
    // Generates a monthly report from real student activity data.
    // Student activity is stored in:
    //   - learning_curve_items / learning_curve_reviews (Supabase)
    //   - answerHistory, mockTestScores, teachBackSessions, learningSignals (localStorage — not accessible server-side)
    // Since localStorage data is not available server-side, we aggregate from
    // Supabase tables (learning_curve_items, learning_curve_reviews) which ARE
    // the persistent store for spaced-repetition activity.

    if (action === "generate_report") {
      const { studentUserId, parentId, month, year } = body;

      if (!studentUserId || !parentId || !month || !year) {
        return jsonError("Missing required fields", 400);
      }

      // Verify the parent is actively connected to this student
      const { data: connection } = await supabase
        .from("parent_student_connections")
        .select("id, student_name")
        .eq("parent_id", parentId)
        .eq("student_id", studentUserId)
        .eq("status", "active")
        .maybeSingle();

      if (!connection) {
        return jsonError("No active connection found for this student", 403);
      }

      // Check if a report already exists for this month/year
      const { data: existing } = await supabase
        .from("monthly_reports")
        .select("id")
        .eq("student_user_id", studentUserId)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      // Calculate date range for the month
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

      // Fetch learning curve items created in this month
      const { data: lcItems } = await supabase
        .from("learning_curve_items")
        .select("subject, chapter, topic, created_at")
        .eq("user_id", studentUserId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch learning curve reviews in this month
      const { data: lcReviews } = await supabase
        .from("learning_curve_reviews")
        .select("item_id, result, reviewed_at")
        .eq("user_id", studentUserId)
        .gte("reviewed_at", startDate.toISOString())
        .lte("reviewed_at", endDate.toISOString());

      // Aggregate subject activity
      const subjectActivity: Record<string, number> = {};
      const topicsSet = new Set<string>();
      const subjectsSet = new Set<string>();

      if (lcItems) {
        for (const item of lcItems) {
          subjectsSet.add(item.subject);
          topicsSet.add(item.topic);
          subjectActivity[item.subject] = (subjectActivity[item.subject] || 0) + 1;
        }
      }

      const revisionSessions = lcReviews ? lcReviews.length : 0;
      const questionsPracticed = lcReviews
        ? lcReviews.filter((r: Record<string, unknown>) => r.result === "correct" || r.result === "incorrect" || r.result === "partial").length
        : 0;

      // Estimate study time: ~10 minutes per learning curve item + ~5 min per review
      const studyTimeMinutes = (lcItems ? lcItems.length * 10 : 0) + revisionSessions * 5;

      const subjectsStudied = subjectsSet.size;
      const topicsStudied = topicsSet.size;
      const practiceSessions = lcItems ? lcItems.length : 0;

      // Generate factual summary
      const subjectList = Array.from(subjectsSet).join(", ");
      let summary = "";
      if (subjectsStudied === 0 && revisionSessions === 0) {
        summary = "Not enough learning activity has been recorded this month.";
      } else {
        const parts: string[] = [];
        if (subjectsStudied > 0) {
          parts.push(`studied ${subjectList}`);
        }
        if (practiceSessions > 0) {
          parts.push(`completed ${practiceSessions} practice session${practiceSessions === 1 ? "" : "s"}`);
        }
        if (revisionSessions > 0) {
          parts.push(`completed ${revisionSessions} revision session${revisionSessions === 1 ? "" : "s"}`);
        }
        summary = `This month, the student ${parts.join(" and ")}.`;
      }

      const reportData = {
        student_user_id: studentUserId,
        student_name: connection.student_name || "Student",
        parent_id: parentId,
        month,
        year,
        study_time_minutes: studyTimeMinutes,
        subjects_studied: subjectsStudied,
        topics_studied: topicsStudied,
        questions_practiced: questionsPracticed,
        practice_sessions: practiceSessions,
        revision_sessions: revisionSessions,
        subject_activity: subjectActivity,
        summary,
        report_status: "pending" as const,
      };

      let reportId: string;

      if (existing) {
        // Update existing report
        const { data: updated, error } = await supabase
          .from("monthly_reports")
          .update(reportData)
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error) return jsonError("Failed to update report", 500);
        reportId = updated.id;
      } else {
        // Insert new report
        const { data: inserted, error } = await supabase
          .from("monthly_reports")
          .insert(reportData)
          .select("id")
          .single();
        if (error) return jsonError("Failed to create report", 500);
        reportId = inserted.id;
      }

      // Attempt email delivery if configured
      let emailSent = false;
      let emailError: string | null = null;

      if (emailApiKey) {
        // Get parent email
        const { data: parent } = await supabase
          .from("parent_profiles")
          .select("email, name")
          .eq("id", parentId)
          .maybeSingle();

        if (parent) {
          try {
            const emailResult = await sendReportEmail(
              emailApiKey,
              parent.email,
              parent.name,
              connection.student_name || "Student",
              month,
              year,
              reportData,
            );
            emailSent = emailResult.success;
            if (!emailSent) emailError = emailResult.error || "Unknown email error";
          } catch (e) {
            emailError = e.message || "Email send failed";
          }
        }
      } else {
        emailError = "EMAIL_API_KEY not configured";
      }

      // Update report status
      const now = new Date().toISOString();
      await supabase
        .from("monthly_reports")
        .update({
          report_status: emailSent ? "sent" : "failed",
          email_sent_at: emailSent ? now : null,
        })
        .eq("id", reportId);

      // Fetch the final report
      const { data: finalReport } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      return jsonResponse({
        success: true,
        report: finalReport,
        emailSent,
        emailError: !emailSent ? emailError : undefined,
      });
    }

    // ---- send_monthly_reports (scheduled job) ----
    // This action is called by a cron/scheduled trigger.
    // It finds all active parent-student connections, generates reports
    // for the previous month, and sends emails.
    if (action === "send_monthly_reports") {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const { data: connections } = await supabase
        .from("parent_student_connections")
        .select("id, parent_id, student_id, student_name")
        .eq("status", "active");

      if (!connections || connections.length === 0) {
        return jsonResponse({ success: true, message: "No active connections found" });
      }

      const results: Array<{ studentId: string; success: boolean; emailSent: boolean }> = [];

      for (const conn of connections) {
        // Generate and send report for each connection
        try {
          const reportResponse = await fetch(`${supabaseUrl}/functions/v1/monthly-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "generate_report",
              studentUserId: conn.student_id,
              parentId: conn.parent_id,
              month: prevMonth,
              year: prevYear,
            }),
          });
          const reportData = await reportResponse.json();
          results.push({
            studentId: conn.student_id,
            success: reportData.success,
            emailSent: reportData.emailSent || false,
          });
        } catch {
          results.push({ studentId: conn.student_id, success: false, emailSent: false });
        }
      }

      return jsonResponse({ success: true, results });
    }

    return jsonError("Unknown action", 400);
  } catch (err) {
    return jsonError(err.message || "Internal error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- Email sending via Resend API ----
// Uses the EMAIL_API_KEY environment variable (Resend API key, starts with "re_")
// The email is sent from noreply@padanamithra.app (or the Resend default domain)
async function sendReportEmail(
  apiKey: string,
  parentEmail: string,
  parentName: string,
  studentName: string,
  month: number,
  year: number,
  reportData: {
    study_time_minutes: number;
    subjects_studied: number;
    topics_studied: number;
    questions_practiced: number;
    practice_sessions: number;
    revision_sessions: number;
    subject_activity: Record<string, number>;
    summary: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long" });

  const subjectLine = `PadanaMithra Monthly Learning Report — ${studentName}`;

  // Build subject-wise breakdown
  const subjectLines = Object.entries(reportData.subject_activity)
    .map(([subj, count]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${subj}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${count} topic${count === 1 ? "" : "s"} studied</td></tr>`)
    .join("");

  const hours = Math.floor(reportData.study_time_minutes / 60);
  const mins = reportData.study_time_minutes % 60;
  const studyTimeStr = `${hours}h ${mins}m`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:22px;">PadanaMithra Monthly Learning Report</h1>
        <p style="color:#e0e7ff;margin:8px 0 0;">${studentName} — ${monthName} ${year}</p>
      </div>
      <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
        <p style="color:#374151;font-size:16px;">Dear ${parentName},</p>
        <p style="color:#374151;">Here is ${studentName}'s learning progress report for ${monthName} ${year}.</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:bold;">Study Time</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${studyTimeStr}</td></tr>
          <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:bold;">Subjects Studied</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${reportData.subjects_studied}</td></tr>
          <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:bold;">Topics Studied</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${reportData.topics_studied}</td></tr>
          <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:bold;">Questions Practiced</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${reportData.questions_practiced}</td></tr>
          <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:bold;">Practice Sessions</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${reportData.practice_sessions}</td></tr>
          <tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:bold;">Revision Sessions</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${reportData.revision_sessions}</td></tr>
        </table>

        ${subjectLines ? `<h3 style="color:#4f46e5;font-size:16px;margin:20px 0 8px;">Subject-wise Activity</h3><table style="width:100%;border-collapse:collapse;">${subjectLines}</table>` : ""}

        <div style="background:#f0f5ff;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0;color:#374151;font-size:14px;"><strong>Learning Summary:</strong> ${reportData.summary}</p>
        </div>

        <p style="color:#6b7280;font-size:14px;margin-top:24px;">Thank you for supporting ${studentName}'s learning journey with PadanaMithra.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This report was automatically generated by PadanaMithra.</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PadanaMithra <noreply@padanamithra.app>",
        to: [parentEmail],
        subject: subjectLine,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Email API error (${response.status}): ${err}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }
}

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

    const body = await req.json();
    const { action } = body;

    // ---- connect_parent ----
    if (action === "connect_parent") {
      const { studentUserId, parentName, parentEmail } = body;

      if (!studentUserId || !parentName || !parentEmail) {
        return jsonError("Missing required fields", 400);
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
        return jsonError("Invalid parent email address", 400);
      }

      // Get student profile from localStorage profiles (not in DB, so we pass the name)
      // The student_user_id is the email-derived slug
      const { data: studentProfile } = await supabase
        .from("parent_student_connections")
        .select("id, student_name")
        .eq("student_id", studentUserId)
        .eq("status", "active")
        .maybeSingle();

      // Find or create parent profile
      const { data: existingParent } = await supabase
        .from("parent_profiles")
        .select("id, email, name")
        .eq("email", parentEmail)
        .maybeSingle();

      let parentId: string;
      let isNewParent = false;

      if (existingParent) {
        parentId = existingParent.id;
      } else {
        // Create new parent profile with a temporary password
        // The parent will set their own password on first login attempt
        const tempPassword = crypto.randomUUID();
        const { data: newParent, error: createErr } = await supabase
          .from("parent_profiles")
          .insert({
            email: parentEmail,
            name: parentName,
            password_hash: tempPassword,
          })
          .select("id")
          .single();

        if (createErr || !newParent) {
          return jsonError("Failed to create parent profile", 500);
        }

        parentId = newParent.id;
        isNewParent = true;
      }

      // Check if connection already exists
      if (studentProfile) {
        return jsonError("Student already has an active parent connection", 400);
      }

      // Get student name from the student's profile
      // Since profiles are in localStorage, we use the parentName as the student name fallback
      // The student name will be passed from the frontend
      const studentName = body.studentName || "Student";

      // Create the connection
      const { error: connErr } = await supabase
        .from("parent_student_connections")
        .insert({
          parent_id: parentId,
          student_id: studentUserId,
          student_name: studentName,
          status: "active",
        });

      if (connErr) {
        return jsonError("Failed to create connection", 500);
      }

      return jsonResponse({
        success: true,
        isNewParent,
        message: isNewParent
          ? "Parent profile created. The parent will need to set up their password on first login."
          : "Connected to existing parent profile.",
      });
    }

    // ---- disconnect_parent ----
    if (action === "disconnect_parent") {
      const { studentUserId } = body;
      if (!studentUserId) return jsonError("Missing studentUserId", 400);

      const { error } = await supabase
        .from("parent_student_connections")
        .update({ status: "disconnected" })
        .eq("student_id", studentUserId)
        .eq("status", "active");

      if (error) return jsonError("Failed to disconnect", 500);

      return jsonResponse({ success: true });
    }

    // ---- parent_login ----
    if (action === "parent_login") {
      const { parentEmail, parentPassword } = body;
      if (!parentEmail || !parentPassword) return jsonError("Missing credentials", 400);

      const { data: parent, error } = await supabase
        .from("parent_profiles")
        .select("id, email, name, password_hash")
        .eq("email", parentEmail)
        .maybeSingle();

      if (error || !parent) {
        return jsonError("No parent account found with this email", 404);
      }

      // Check if it's a temporary password (first login)
      const isTemp = parent.password_hash.length > 40 && parent.password_hash.includes("-");

      if (isTemp) {
        // First login — set the password
        const { error: updateErr } = await supabase
          .from("parent_profiles")
          .update({ password_hash: parentPassword })
          .eq("id", parent.id);

        if (updateErr) return jsonError("Failed to set password", 500);

        return jsonResponse({
          success: true,
          parent: { id: parent.id, name: parent.name, email: parent.email },
          firstLogin: true,
        });
      }

      // Normal login — check password
      if (parent.password_hash !== parentPassword) {
        return jsonError("Incorrect password", 401);
      }

      return jsonResponse({
        success: true,
        parent: { id: parent.id, name: parent.name, email: parent.email },
      });
    }

    // ---- get_connections ----
    if (action === "get_connections") {
      const { parentId } = body;
      if (!parentId) return jsonError("Missing parentId", 400);

      const { data: connections, error } = await supabase
        .from("parent_student_connections")
        .select("id, parent_id, student_id, student_name, status, created_at")
        .eq("parent_id", parentId)
        .eq("status", "active");

      if (error) return jsonError("Failed to fetch connections", 500);

      return jsonResponse({
        connections: (connections || []).map((c: Record<string, unknown>) => ({
          id: c.id,
          parentId: c.parent_id,
          studentId: c.student_id,
          studentName: c.student_name,
          status: c.status,
          createdAt: c.created_at,
        })),
      });
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

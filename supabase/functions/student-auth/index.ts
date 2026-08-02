import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-user-id",
};

// Simple bcrypt implementation using Web Crypto API
// We use a PBKDF2-based hash since bcrypt isn't natively available in Deno.
// This provides secure password hashing with salt + iterations.
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const storedHashHex = parts[3];

    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    );
    const hashArray = new Uint8Array(derivedBits);
    const hashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex === storedHashHex;
  } catch {
    return false;
  }
}

function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function emailToUserId(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

    // ---- SIGNUP ----
    if (action === "signup") {
      const { name, email, password } = body;

      if (!name?.trim() || !email?.trim() || !password) {
        return new Response(JSON.stringify({ error: "Please complete all required fields." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!isValidEmail(email)) {
        return new Response(JSON.stringify({ error: "Please enter a valid email address." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.length < 4) {
        return new Response(JSON.stringify({ error: "Password must be at least 4 characters long." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if account already exists
      const { data: existing } = await supabase
        .from("student_auth")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          error: "An account already exists with this email. Please log in instead.",
          accountExists: true,
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const passwordHash = await hashPassword(password);
      const sessionToken = generateSessionToken();
      const sessionExpiry = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

      const { data: newAuth, error: insertError } = await supabase
        .from("student_auth")
        .insert({
          email: email.toLowerCase(),
          name: name.trim(),
          password_hash: passwordHash,
          session_token: sessionToken,
          session_expires_at: sessionExpiry,
        })
        .select("id, email, name")
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: "We couldn't create your account. Please try again." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        user: { email: newAuth.email, name: newAuth.name },
        sessionToken,
        sessionExpiresAt: sessionExpiry,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- LOGIN ----
    if (action === "login") {
      const { email, password } = body;

      if (!email?.trim() || !password) {
        return new Response(JSON.stringify({ error: "Please enter both email and password." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authRow, error: queryError } = await supabase
        .from("student_auth")
        .select("id, email, name, password_hash, session_token, session_expires_at")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (queryError || !authRow) {
        return new Response(JSON.stringify({ error: "No account found with that email. Please sign up first." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const passwordValid = await verifyPassword(password, authRow.password_hash);
      if (!passwordValid) {
        return new Response(JSON.stringify({ error: "Incorrect email or password." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate new session token
      const sessionToken = generateSessionToken();
      const sessionExpiry = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

      await supabase
        .from("student_auth")
        .update({
          session_token: sessionToken,
          session_expires_at: sessionExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authRow.id);

      return new Response(JSON.stringify({
        success: true,
        user: { email: authRow.email, name: authRow.name },
        sessionToken,
        sessionExpiresAt: sessionExpiry,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- VERIFY SESSION ----
    if (action === "verify_session") {
      const { sessionToken } = body;

      if (!sessionToken) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authRow, error } = await supabase
        .from("student_auth")
        .select("id, email, name, session_expires_at")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (error || !authRow) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (authRow.session_expires_at && new Date(authRow.session_expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, expired: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        valid: true,
        user: { email: authRow.email, name: authRow.name },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- LOGOUT ----
    if (action === "logout") {
      const { sessionToken } = body;

      if (sessionToken) {
        await supabase
          .from("student_auth")
          .update({
            session_token: null,
            session_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("session_token", sessionToken);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- RESET PASSWORD ----
    if (action === "reset_password") {
      const { email, newPassword } = body;

      if (!email?.trim() || !newPassword) {
        return new Response(JSON.stringify({ error: "Please enter your email and a new password." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (newPassword.length < 4) {
        return new Response(JSON.stringify({ error: "Password must be at least 4 characters long." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authRow } = await supabase
        .from("student_auth")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (!authRow) {
        // Don't reveal whether the email exists — but for UX in a student app, tell them
        return new Response(JSON.stringify({ error: "No account found with that email." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newPasswordHash = await hashPassword(newPassword);

      await supabase
        .from("student_auth")
        .update({
          password_hash: newPasswordHash,
          session_token: null,
          session_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authRow.id);

      return new Response(JSON.stringify({
        success: true,
        message: "Your password has been reset. Please log in with your new password.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- GET PROFILE ----
    if (action === "get_profile") {
      const { userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ profile: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ profile: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ profile }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- SAVE PROFILE (with backend age validation) ----
    if (action === "save_profile") {
      const { userId, fullName, dateOfBirth, board, classLevel, selectedSubjects, currentSubject, currentChapter, currentTopic, preferredLanguage, onboardingCompleted } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing user ID." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate DOB / age on the backend
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth as string);
        if (isNaN(dob.getTime())) {
          return new Response(JSON.stringify({ error: "Please enter a valid date of birth." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (dob > new Date()) {
          return new Response(JSON.stringify({ error: "Please enter a valid date of birth." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Calculate age from DOB
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const hasHadBirthday =
          today.getMonth() > dob.getMonth() ||
          (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
        if (!hasHadBirthday) age--;

        if (age < 10) {
          return new Response(JSON.stringify({ error: "Padanamithra is available for learners aged 10 and above." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const row = {
        user_id: userId as string,
        email: userId as string,
        full_name: fullName as string | null,
        date_of_birth: dateOfBirth as string | null,
        board: board as string | null,
        class_level: classLevel as string | null,
        selected_subjects: selectedSubjects as string[] | null,
        current_subject: currentSubject as string | null,
        current_chapter: currentChapter as string | null,
        current_topic: currentTopic as string | null,
        preferred_language: preferredLanguage as string | null,
        onboarding_completed: onboardingCompleted as boolean | null,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("student_profiles")
        .upsert(row, { onConflict: "user_id" });

      if (upsertError) {
        return new Response(JSON.stringify({ error: "We couldn't save your profile. Please try again." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "We couldn't connect to Padanamithra. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

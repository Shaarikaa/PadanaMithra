
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

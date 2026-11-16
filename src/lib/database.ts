import { supabase } from "@/supabaseClient";

export interface StudentRow {
  id: string;
  student_number: string;
  full_name: string;
  program: string | null;
  year_level: number | null;
  status: string;
}

export async function getStudents(): Promise<StudentRow[]> {

const {
  data: { session },
  error: sessionError
} = await supabase.auth.getSession();

console.log("SUPABASE AUTH CHECK:", {
  hasSession: !!session,
  userId: session?.user.id ?? null,
  sessionError
});

  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      student_number,
      full_name,
      program,
      year_level,
      status
    `)
    .order("full_name", { ascending: true });

  if (error) {
  console.error("Student retrieval failed:", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  throw error;
}

  return data ?? [];
}

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
    console.error("Student retrieval failed:", error.message);
    throw error;
  }

  return data ?? [];
}

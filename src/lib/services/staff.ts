import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";

export async function getStaff(user: AppUser, role = "all", q = "") {
  const supabase = await createClient();
  let query = supabase
    .from("staff_directory")
    .select("*")
    .eq("school_id", user.schoolId)
    .order("full_name");

  if (role !== "all") query = query.eq("role", role);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getStaffProfile(user: AppUser, staffId: string) {
  const supabase = await createClient();
  const [{ data: member, error: memberError }, assignments, headClasses, employment] = await Promise.all([
    supabase.from("staff_directory").select("*").eq("school_id", user.schoolId).eq("user_id", staffId).maybeSingle(),
    supabase.from("teacher_assignments").select("id,classes(id,name,room,grades(name),sections(name)),subjects(name)").eq("school_id", user.schoolId).eq("teacher_id", staffId),
    supabase.from("classes").select("id,name,room,grades(name),sections(name)").eq("school_id", user.schoolId).eq("head_teacher_id", staffId),
    supabase.from("teacher_employment_details").select("*").eq("school_id", user.schoolId).eq("teacher_id", staffId).maybeSingle()
  ]);
  if (memberError) throw new Error(memberError.message);
  if (assignments.error) throw new Error(assignments.error.message);
  if (headClasses.error) throw new Error(headClasses.error.message);
  if (employment.error && employment.error.code !== "PGRST116") throw new Error(employment.error.message);
  return {
    member,
    assignments: assignments.data ?? [],
    headClasses: headClasses.data ?? [],
    employment: employment.data ?? null
  };
}

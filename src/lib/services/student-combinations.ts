import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { defaultCombinationOptionsForGrade, type StudentCombinationOption } from "@/lib/student-majors";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CustomCombinationSummary = {
  id: string;
  value: `custom:${string}`;
  name: string;
  classIds: string[];
  classNames: string[];
  subjectIds: string[];
  subjectNames: string[];
};

export async function getCombinationOptionsForClass(user: AppUser, classId: string, gradeName: string) {
  const supabase = await createClient();
  const custom = await getCustomCombinationOptionsForClass(supabase, user.schoolId, classId);
  return [...defaultCombinationOptionsForGrade(gradeName), ...custom];
}

export async function getCustomCombinationOptionsForClass(
  supabase: Supabase,
  schoolId: string,
  classId: string
): Promise<StudentCombinationOption[]> {
  const { data, error } = await supabase
    .from("student_subject_combinations")
    .select("id,name,student_subject_combination_classes!inner(class_id),student_subject_combination_subjects(subject_id)")
    .eq("school_id", schoolId)
    .eq("student_subject_combination_classes.class_id", classId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    if (error.code === "42P01" || error.message.includes("student_subject_combinations")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    value: `custom:${row.id}`,
    label: row.name,
    kind: "custom",
    classIds: (row.student_subject_combination_classes ?? []).map((item: any) => item.class_id),
    subjectIds: (row.student_subject_combination_subjects ?? []).map((item: any) => item.subject_id)
  }));
}

export async function getCustomCombinationOptionForClass(
  supabase: Supabase,
  schoolId: string,
  classId: string,
  major: string | null | undefined
) {
  if (!major?.startsWith("custom:")) return null;
  const id = major.slice("custom:".length);
  const options = await getCustomCombinationOptionsForClass(supabase, schoolId, classId);
  return options.find((option) => option.value === `custom:${id}`) ?? null;
}

export async function getSubjectCombinationCatalog(user: AppUser) {
  const supabase = await createClient();
  const [{ data: classes, error: classesError }, { data: customRows, error: customError }] = await Promise.all([
    supabase.from("classes").select("id,name,grades(name),sections(name)").eq("school_id", user.schoolId).order("name"),
    supabase
      .from("student_subject_combinations")
      .select("id,name,student_subject_combination_classes(class_id,classes(name,grades(name),sections(name))),student_subject_combination_subjects(subject_id,subjects(name))")
      .eq("school_id", user.schoolId)
      .eq("is_active", true)
      .order("name")
  ]);

  if (classesError) throw new Error(classesError.message);
  if (customError) {
    if (customError.code !== "42P01" && !customError.message.includes("student_subject_combinations")) throw new Error(customError.message);
  }

  const defaultCombinations = (classes ?? []).flatMap((classRow: any) =>
    defaultCombinationOptionsForGrade(classRow.grades?.name).map((option) => ({
      value: option.value,
      name: option.label,
      className: formatClassName(classRow),
      subjectNames: [] as string[],
      kind: "default" as const
    }))
  );

  const customCombinations: CustomCombinationSummary[] = (customRows ?? []).map((row: any) => ({
    id: row.id,
    value: `custom:${row.id}`,
    name: row.name,
    classIds: (row.student_subject_combination_classes ?? []).map((item: any) => item.class_id),
    classNames: (row.student_subject_combination_classes ?? []).map((item: any) => formatClassName(item.classes)),
    subjectIds: (row.student_subject_combination_subjects ?? []).map((item: any) => item.subject_id),
    subjectNames: (row.student_subject_combination_subjects ?? []).map((item: any) => item.subjects?.name ?? "Unknown")
  }));

  return { defaultCombinations, customCombinations };
}

export async function createStudentSubjectCombination(user: AppUser, values: { name: string; classIds: string[]; subjectIds: string[] }) {
  const supabase = await createClient();
  const name = values.name.trim().replace(/\s+/g, " ");
  const classIds = [...new Set(values.classIds)].filter(Boolean);
  const subjectIds = [...new Set(values.subjectIds)].filter(Boolean);

  if (!name) throw new Error("Combination name is required.");
  if (!classIds.length) throw new Error("Select at least one class.");
  if (!subjectIds.length) throw new Error("Select at least one subject.");

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id")
    .eq("school_id", user.schoolId)
    .in("id", classIds);
  if (classesError) throw new Error(classesError.message);
  if ((classes ?? []).length !== classIds.length) throw new Error("One or more selected classes could not be found.");

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id")
    .eq("school_id", user.schoolId)
    .in("id", subjectIds);
  if (subjectsError) throw new Error(subjectsError.message);
  if ((subjects ?? []).length !== subjectIds.length) throw new Error("One or more selected subjects could not be found.");

  const { data: combination, error } = await supabase
    .from("student_subject_combinations")
    .insert({ school_id: user.schoolId, name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const combinationId = combination.id as string;
  const [{ error: classSubjectError }, { error: classError }, { error: subjectError }] = await Promise.all([
    supabase.from("class_subjects").upsert(
      classIds.flatMap((classId) => subjectIds.map((subjectId) => ({
        school_id: user.schoolId,
        class_id: classId,
        subject_id: subjectId,
        is_class_specific: false
      }))),
      { onConflict: "school_id,class_id,subject_id" }
    ),
    supabase.from("student_subject_combination_classes").insert(classIds.map((classId) => ({
      school_id: user.schoolId,
      combination_id: combinationId,
      class_id: classId
    }))),
    supabase.from("student_subject_combination_subjects").insert(subjectIds.map((subjectId) => ({
      school_id: user.schoolId,
      combination_id: combinationId,
      subject_id: subjectId
    })))
  ]);
  if (classSubjectError) throw new Error(classSubjectError.message);
  if (classError) throw new Error(classError.message);
  if (subjectError) throw new Error(subjectError.message);
}

export async function updateStudentSubjectCombination(
  user: AppUser,
  combinationId: string,
  values: { name: string; classIds: string[]; subjectIds: string[] }
) {
  const supabase = await createClient();
  const name = values.name.trim().replace(/\s+/g, " ");
  const classIds = [...new Set(values.classIds)].filter(Boolean);
  const subjectIds = [...new Set(values.subjectIds)].filter(Boolean);

  if (!name) throw new Error("Combination name is required.");
  if (!classIds.length) throw new Error("Select at least one class.");
  if (!subjectIds.length) throw new Error("Select at least one subject.");

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id")
    .eq("school_id", user.schoolId)
    .in("id", classIds);
  if (classesError) throw new Error(classesError.message);
  if ((classes ?? []).length !== classIds.length) throw new Error("One or more selected classes could not be found.");

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id")
    .eq("school_id", user.schoolId)
    .in("id", subjectIds);
  if (subjectsError) throw new Error(subjectsError.message);
  if ((subjects ?? []).length !== subjectIds.length) throw new Error("One or more selected subjects could not be found.");

  const { error: updateError } = await supabase
    .from("student_subject_combinations")
    .update({ name })
    .eq("school_id", user.schoolId)
    .eq("id", combinationId);
  if (updateError) throw new Error(updateError.message);

  await Promise.all([
    supabase.from("student_subject_combination_classes").delete().eq("school_id", user.schoolId).eq("combination_id", combinationId),
    supabase.from("student_subject_combination_subjects").delete().eq("school_id", user.schoolId).eq("combination_id", combinationId)
  ]);

  const [{ error: classSubjectError }, { error: classError }, { error: subjectError }] = await Promise.all([
    supabase.from("class_subjects").upsert(
      classIds.flatMap((classId) => subjectIds.map((subjectId) => ({
        school_id: user.schoolId,
        class_id: classId,
        subject_id: subjectId,
        is_class_specific: false
      }))),
      { onConflict: "school_id,class_id,subject_id" }
    ),
    supabase.from("student_subject_combination_classes").insert(classIds.map((classId) => ({
      school_id: user.schoolId,
      combination_id: combinationId,
      class_id: classId
    }))),
    supabase.from("student_subject_combination_subjects").insert(subjectIds.map((subjectId) => ({
      school_id: user.schoolId,
      combination_id: combinationId,
      subject_id: subjectId
    })))
  ]);
  if (classSubjectError) throw new Error(classSubjectError.message);
  if (classError) throw new Error(classError.message);
  if (subjectError) throw new Error(subjectError.message);
}

export async function deleteStudentSubjectCombination(user: AppUser, combinationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_subject_combinations")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("id", combinationId);
  if (error) throw new Error(error.message);
}

function formatClassName(classRow: any) {
  if (!classRow) return "Unknown class";
  const grade = classRow.grades?.name;
  const section = classRow.sections?.name;
  return [grade, classRow.name, section].filter(Boolean).join(" · ");
}


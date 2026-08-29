import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { defaultCombinationOptionsForGrade, isDefaultStudentMajor, isSubjectExcludedForMajor, type StudentCombinationOption, type StudentMajor } from "@/lib/student-majors";
import { canonicalSubjectName, getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";
import { formatGradeSection } from "@/lib/utils";
type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CustomCombinationSummary = {
  id: string;
  value: `custom:${string}`;
  name: string;
  classIds: string[];
  classNames: string[];
  gradeIds: string[];
  gradeNames: string[];
  subjectIds: string[];
  subjectNames: string[];
};

export async function getCombinationOptionsForClass(user: AppUser, classId: string, gradeName: string) {
  const supabase = await createClient();
  const defaultOptions = defaultCombinationOptionsForGrade(gradeName);
  const overrides = await getDefaultCombinationOverridesForClass(supabase, user.schoolId, classId);
  const custom = await getCustomCombinationOptionsForClass(supabase, user.schoolId, classId);
  return [
    ...defaultOptions.map((option) => {
      const override = overrides.find((item) => item.value === option.value);
      return override ? { ...option, label: override.label, subjectIds: override.subjectIds } : option;
    }),
    ...custom
  ];
}

export async function getDefaultCombinationOverrideForClass(
  supabase: Supabase,
  schoolId: string,
  classId: string,
  major: string | null | undefined
) {
  if (!isDefaultStudentMajor(major)) return null;
  const overrides = await getDefaultCombinationOverridesForClass(supabase, schoolId, classId);
  return overrides.find((option) => option.value === major) ?? null;
}

async function getDefaultCombinationOverridesForClass(
  supabase: Supabase,
  schoolId: string,
  classId: string
): Promise<StudentCombinationOption[]> {
  const { data, error } = await supabase
    .from("student_subject_combinations")
    .select("id,name,combination_key,student_subject_combination_classes!inner(class_id),student_subject_combination_subjects(subject_id)")
    .eq("school_id", schoolId)
    .eq("student_subject_combination_classes.class_id", classId)
    .eq("is_active", true)
    .not("combination_key", "is", null)
    .order("name");

  if (error) {
    if (error.code === "42P01" || error.code === "42703" || error.message.includes("student_subject_combinations") || error.message.includes("combination_key")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).filter((row: any) => isDefaultStudentMajor(row.combination_key)).map((row: any) => ({
    value: row.combination_key as StudentMajor,
    label: row.name,
    kind: "default",
    classIds: (row.student_subject_combination_classes ?? []).map((item: any) => item.class_id),
    subjectIds: (row.student_subject_combination_subjects ?? []).map((item: any) => item.subject_id)
  }));
}

export async function getCustomCombinationOptionsForClass(
  supabase: Supabase,
  schoolId: string,
  classId: string
): Promise<StudentCombinationOption[]> {
  const { data, error } = await supabase
    .from("student_subject_combinations")
    .select("id,name,combination_key,student_subject_combination_classes!inner(class_id),student_subject_combination_subjects(subject_id)")
    .eq("school_id", schoolId)
    .eq("student_subject_combination_classes.class_id", classId)
    .eq("is_active", true)
    .is("combination_key", null)
    .order("name");

  if (error) {
    if (error.code === "42P01" || error.code === "42703" || error.message.includes("student_subject_combinations") || error.message.includes("combination_key")) return [];
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
  const [{ data: classes, error: classesError }, { data: subjects, error: subjectsError }, { data: combinationRows, error: customError }] = await Promise.all([
    supabase.from("classes").select("id,name,grade_id,grades(name),sections(name)").eq("school_id", user.schoolId).order("name"),
    supabase.from("subjects").select("id,name").eq("school_id", user.schoolId).order("name"),
    supabase
      .from("student_subject_combinations")
      .select("id,name,grade_id,combination_key,student_subject_combination_classes(class_id,classes(name,grade_id,grades(name),sections(name))),student_subject_combination_subjects(subject_id,subjects(name))")
      .eq("school_id", user.schoolId)
      .eq("is_active", true)
      .order("name")
  ]);

  if (classesError) throw new Error(classesError.message);
  if (subjectsError) throw new Error(subjectsError.message);
  if (customError) {
    if (customError.code !== "42P01" && customError.code !== "42703" && !customError.message.includes("student_subject_combinations") && !customError.message.includes("combination_key")) throw new Error(customError.message);
  }

  const grades = new Map<string, { id: string; name: string }>();
  for (const classRow of (classes ?? []) as any[]) {
    const gradeName = classRow.grades?.name ?? classRow.name;
    if (classRow.grade_id && gradeName) grades.set(classRow.grade_id, { id: classRow.grade_id, name: gradeName });
  }

  const subjectsByName = new Map((subjects ?? []).map((subject: any) => [canonicalSubjectName(subject.name), { id: subject.id as string, name: subject.name as string }]));
  const overridesByGradeAndKey = new Map(
    (combinationRows ?? [])
      .filter((row: any) => row.grade_id && isDefaultStudentMajor(row.combination_key))
      .map((row: any) => [`${row.grade_id}:${row.combination_key}`, row])
  );

  const defaultCombinations = [...grades.values()].flatMap((grade) =>
    defaultCombinationOptionsForGrade(grade.name).map((option) => {
      const override = overridesByGradeAndKey.get(`${grade.id}:${option.value}`) as any | undefined;
      const defaultSubjectNames = getDefaultSubjectsForGrade(grade.name)
        .filter((subject) => !isSubjectExcludedForMajor(grade.name, option.value, subject.name))
        .map((subject) => subjectsByName.get(canonicalSubjectName(subject.name)))
        .filter(Boolean) as { id: string; name: string }[];
      return {
        id: override?.id as string | undefined,
        value: option.value,
        name: override?.name ?? option.label,
        gradeId: grade.id,
        gradeName: grade.name,
        subjectIds: override
          ? (override.student_subject_combination_subjects ?? []).map((item: any) => item.subject_id)
          : defaultSubjectNames.map((subject) => subject.id),
        subjectNames: override
          ? (override.student_subject_combination_subjects ?? []).map((item: any) => item.subjects?.name ?? "Unknown")
          : defaultSubjectNames.map((subject) => subject.name),
        kind: "default" as const
      };
    })
  );

  const customCombinations: CustomCombinationSummary[] = (combinationRows ?? []).filter((row: any) => !row.combination_key).map((row: any) => ({
    id: row.id,
    value: `custom:${row.id}`,
    name: row.name,
    classIds: (row.student_subject_combination_classes ?? []).map((item: any) => item.class_id),
    classNames: (row.student_subject_combination_classes ?? []).map((item: any) => formatClassName(item.classes)),
    gradeIds: uniqueValues((row.student_subject_combination_classes ?? []).map((item: any) => item.classes?.grade_id).filter(Boolean)),
    gradeNames: uniqueValues((row.student_subject_combination_classes ?? []).map((item: any) => item.classes?.grades?.name ?? item.classes?.name).filter(Boolean)),
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

export async function updateDefaultStudentSubjectCombination(
  user: AppUser,
  values: { combinationKey: string; gradeId: string; name: string; subjectIds: string[] }
) {
  const supabase = await createClient();
  const name = values.name.trim().replace(/\s+/g, " ");
  const subjectIds = [...new Set(values.subjectIds)].filter(Boolean);

  if (!isDefaultStudentMajor(values.combinationKey)) throw new Error("That default combination is not available.");
  if (!name) throw new Error("Combination name is required.");
  if (!subjectIds.length) throw new Error("Select at least one subject.");

  const [{ data: grade, error: gradeError }, { data: classes, error: classesError }, { data: subjects, error: subjectsError }] = await Promise.all([
    supabase.from("grades").select("id").eq("school_id", user.schoolId).eq("id", values.gradeId).maybeSingle(),
    supabase.from("classes").select("id").eq("school_id", user.schoolId).eq("grade_id", values.gradeId),
    supabase.from("subjects").select("id").eq("school_id", user.schoolId).in("id", subjectIds)
  ]);
  if (gradeError) throw new Error(gradeError.message);
  if (classesError) throw new Error(classesError.message);
  if (subjectsError) throw new Error(subjectsError.message);
  if (!grade) throw new Error("Selected grade could not be found.");
  if (!(classes ?? []).length) throw new Error("Selected grade has no sections yet.");
  if ((subjects ?? []).length !== subjectIds.length) throw new Error("One or more selected subjects could not be found.");

  const { data: existingCombination, error: existingError } = await supabase
    .from("student_subject_combinations")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("grade_id", values.gradeId)
    .eq("combination_key", values.combinationKey)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const combinationResult = existingCombination
    ? await supabase
      .from("student_subject_combinations")
      .update({ name, is_active: true })
      .eq("school_id", user.schoolId)
      .eq("id", existingCombination.id)
      .select("id")
      .single()
    : await supabase
      .from("student_subject_combinations")
      .insert({
        school_id: user.schoolId,
        grade_id: values.gradeId,
        combination_key: values.combinationKey,
        name,
        is_active: true
      })
      .select("id")
      .single();

  if (combinationResult.error) throw new Error(combinationResult.error.message);

  const combinationId = combinationResult.data.id as string;
  await Promise.all([
    supabase.from("student_subject_combination_classes").delete().eq("school_id", user.schoolId).eq("combination_id", combinationId),
    supabase.from("student_subject_combination_subjects").delete().eq("school_id", user.schoolId).eq("combination_id", combinationId)
  ]);

  const classIds = (classes ?? []).map((classRow: any) => classRow.id as string);
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
  const grade = classRow.grades?.name || classRow.name;
  const section = classRow.sections?.name;
  return formatGradeSection(grade, section);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

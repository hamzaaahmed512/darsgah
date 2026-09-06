import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const [overrides, custom, disabledDefaults, sectionExclusions, defaultSubjectIds] = await Promise.all([
    getDefaultCombinationOverridesForClass(supabase, user.schoolId, classId),
    getCustomCombinationOptionsForClass(supabase, user.schoolId, classId),
    getDisabledDefaultCombinationValuesForClass(supabase, user.schoolId, classId),
    getSectionCombinationExclusions(supabase, user.schoolId, classId),
    getDefaultSubjectIdsForClass(supabase, user.schoolId, classId, gradeName)
  ]);
  return [
    ...defaultOptions.flatMap((option) => {
      const override = overrides.find((item) => item.value === option.value);
      if (disabledDefaults.has(option.value as StudentMajor) || (override && !override.isActive)) return [];
      const excluded = override ? sectionExclusions.get((override as any).combinationId) : undefined;
      const subjectIds = override?.subjectIds?.length ? override.subjectIds : defaultSubjectIds.get(option.value as StudentMajor) ?? [];
      return [override ? { ...option, label: override.label, subjectIds: subjectIds.filter((subjectId) => !excluded?.has(subjectId)), sectionCustomized: Boolean(excluded?.size) } : { ...option, subjectIds }];
    }),
    ...custom.map((option: any) => ({ ...option, subjectIds: (option.subjectIds ?? []).filter((subjectId: string) => !sectionExclusions.get(option.combinationId)?.has(subjectId)), sectionCustomized: Boolean(sectionExclusions.get(option.combinationId)?.size) }))
  ];
}

async function getDefaultSubjectIdsForClass(supabase: Supabase, schoolId: string, classId: string, gradeName: string) {
  const { data, error } = await supabase
    .from("class_subjects")
    .select("subject_id,subjects(name)")
    .eq("school_id", schoolId)
    .eq("class_id", classId);
  if (error) throw new Error(error.message);
  const defaults = getDefaultSubjectsForGrade(gradeName);
  const expectedNames = new Set(defaults.map((subject) => canonicalSubjectName(subject.name)));
  const preferredNames = new Set(defaults.map((subject) => subject.name.trim().toLocaleLowerCase()));
  const result = new Map<StudentMajor, string[]>();
  for (const option of defaultCombinationOptionsForGrade(gradeName)) {
    const candidates = (data ?? [])
      .filter((row: any) => expectedNames.has(canonicalSubjectName(row.subjects?.name ?? "")) && !isSubjectExcludedForMajor(gradeName, option.value, row.subjects?.name ?? ""));
    const preferredByCanonicalName = new Map<string, any>();
    for (const row of candidates) {
      const key = canonicalSubjectName((row as any).subjects?.name ?? "");
      const isPreferred = preferredNames.has(String((row as any).subjects?.name ?? "").trim().toLocaleLowerCase());
      const current = preferredByCanonicalName.get(key);
      if (!current || isPreferred) preferredByCanonicalName.set(key, row);
    }
    result.set(option.value as StudentMajor, [...preferredByCanonicalName.values()].map((row: any) => row.subject_id as string));
  }
  return result;
}

async function getSectionCombinationExclusions(supabase: Supabase, schoolId: string, classId: string) {
  const { data, error } = await supabase
    .from("student_subject_combination_section_subject_overrides")
    .select("combination_id,subject_id")
    .eq("school_id", schoolId)
    .eq("class_id", classId);
  if (error) {
    if (error.code === "42P01" || error.message.includes("student_subject_combination_section_subject_overrides")) return new Map<string, Set<string>>();
    throw new Error(error.message);
  }
  const result = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const subjects = result.get((row as any).combination_id) ?? new Set<string>();
    subjects.add((row as any).subject_id);
    result.set((row as any).combination_id, subjects);
  }
  return result;
}

async function getDisabledDefaultCombinationValuesForClass(supabase: Supabase, schoolId: string, classId: string) {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("grade_id")
    .eq("school_id", schoolId)
    .eq("id", classId)
    .maybeSingle();
  if (classError) throw new Error(classError.message);
  if (!classRow?.grade_id) return new Set<StudentMajor>();

  const { data, error } = await supabase
    .from("student_subject_combinations")
    .select("combination_key")
    .eq("school_id", schoolId)
    .eq("grade_id", classRow.grade_id)
    .eq("is_active", false)
    .not("combination_key", "is", null);
  if (error) {
    if (error.code === "42P01" || error.code === "42703" || error.message.includes("student_subject_combinations") || error.message.includes("combination_key")) return new Set<StudentMajor>();
    throw new Error(error.message);
  }
  return new Set((data ?? []).map((row: any) => row.combination_key).filter(isDefaultStudentMajor));
}

export async function getDefaultCombinationOverrideForClass(
  supabase: Supabase,
  schoolId: string,
  classId: string,
  major: string | null | undefined
) {
  if (!isDefaultStudentMajor(major)) return null;
  const [overrides, exclusions] = await Promise.all([
    getDefaultCombinationOverridesForClass(supabase, schoolId, classId),
    getSectionCombinationExclusions(supabase, schoolId, classId)
  ]);
  const override = overrides.find((option) => option.value === major);
  if (!override) return null;
  const excluded = exclusions.get((override as any).combinationId);
  return { ...override, subjectIds: (override.subjectIds ?? []).filter((subjectId) => !excluded?.has(subjectId)) };
}

async function getDefaultCombinationOverridesForClass(
  supabase: Supabase,
  schoolId: string,
  classId: string
): Promise<Array<StudentCombinationOption & { isActive: boolean }>> {
  const { data, error } = await supabase
    .from("student_subject_combinations")
    .select("id,name,combination_key,is_active,student_subject_combination_classes!inner(class_id),student_subject_combination_subjects(subject_id)")
    .eq("school_id", schoolId)
    .eq("student_subject_combination_classes.class_id", classId)
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
    isActive: row.is_active,
    combinationId: row.id,
    classIds: (row.student_subject_combination_classes ?? []).map((item: any) => item.class_id),
    subjectIds: (row.student_subject_combination_subjects ?? []).map((item: any) => item.subject_id)
  })) as Array<StudentCombinationOption & { isActive: boolean }>;
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
    combinationId: row.id,
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
    supabase.from("subjects").select("id,name").eq("school_id", user.schoolId).is("archived_at", null).order("name"),
    supabase
      .from("student_subject_combinations")
      .select("id,name,grade_id,combination_key,is_active,student_subject_combination_classes(class_id,classes(name,grade_id,grades(name),sections(name))),student_subject_combination_subjects(subject_id,subjects(name))")
      .eq("school_id", user.schoolId)
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
    defaultCombinationOptionsForGrade(grade.name).flatMap((option) => {
      const override = overridesByGradeAndKey.get(`${grade.id}:${option.value}`) as any | undefined;
      if (override && !override.is_active) return [];
      const defaultSubjectNames = getDefaultSubjectsForGrade(grade.name)
        .filter((subject) => !isSubjectExcludedForMajor(grade.name, option.value, subject.name))
        .map((subject) => subjectsByName.get(canonicalSubjectName(subject.name)))
        .filter(Boolean) as { id: string; name: string }[];
      return [{
        id: override?.id as string | undefined,
        value: option.value,
        name: override?.name ?? option.label,
        gradeId: grade.id,
        gradeName: grade.name,
        subjectIds: override && (override.student_subject_combination_subjects ?? []).length
          ? (override.student_subject_combination_subjects ?? []).map((item: any) => item.subject_id)
          : defaultSubjectNames.map((subject) => subject.id),
        subjectNames: override && (override.student_subject_combination_subjects ?? []).length
          ? (override.student_subject_combination_subjects ?? []).map((item: any) => item.subjects?.name ?? "Unknown")
          : defaultSubjectNames.map((subject) => subject.name),
        kind: "default" as const
      }];
    })
  );

  const customCombinations: CustomCombinationSummary[] = (combinationRows ?? []).filter((row: any) => !row.combination_key && row.is_active).map((row: any) => ({
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
    .is("archived_at", null)
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
  await syncStudentsForCombination(user, `custom:${combinationId}`, classIds, subjectIds);
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
    supabase.from("subjects").select("id").eq("school_id", user.schoolId).is("archived_at", null).in("id", subjectIds)
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
  await syncStudentsForCombination(user, values.combinationKey, classIds, subjectIds);
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
    .is("archived_at", null)
    .in("id", subjectIds);
  if (subjectsError) throw new Error(subjectsError.message);
  if ((subjects ?? []).length !== subjectIds.length) throw new Error("One or more selected subjects could not be found.");

  const { data: previousClassLinks, error: previousClassError } = await supabase
    .from("student_subject_combination_classes")
    .select("class_id")
    .eq("school_id", user.schoolId)
    .eq("combination_id", combinationId);
  if (previousClassError) throw new Error(previousClassError.message);
  const previousClassIds = (previousClassLinks ?? []).map((item: any) => item.class_id as string);

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
  const removedClassIds = previousClassIds.filter((classId) => !classIds.includes(classId));
  if (removedClassIds.length) await syncStudentsForCombination(user, `custom:${combinationId}`, removedClassIds, []);
  await syncStudentsForCombination(user, `custom:${combinationId}`, classIds, subjectIds);
}

async function syncStudentsForCombination(user: AppUser, combinationValue: string, classIds: string[], subjectIds: string[]) {
  if (!classIds.length) return;
  const admin = createAdminClient();
  const { data: enrollments, error: enrollmentError } = await admin
    .from("enrollments")
    .select("class_id,student_id,students!inner(id,major,status)")
    .eq("school_id", user.schoolId)
    .eq("status", "active")
    .in("class_id", classIds)
    .eq("students.major", combinationValue)
    .eq("students.status", "active");
  if (enrollmentError) throw new Error(enrollmentError.message);

  const enrolledStudents = (enrollments ?? []).map((enrollment: any) => ({ classId: enrollment.class_id as string, studentId: enrollment.student_id as string }));
  const studentIds = [...new Set(enrolledStudents.map((item) => item.studentId))];
  if (studentIds.length) {
    let staleQuery = admin
      .from("student_subject_enrollments")
      .delete()
      .eq("school_id", user.schoolId)
      .in("class_id", classIds)
      .in("student_id", studentIds);
    if (subjectIds.length) staleQuery = staleQuery.not("subject_id", "in", `(${subjectIds.join(",")})`);
    const { error: staleError } = await staleQuery;
    if (staleError) throw new Error(staleError.message);
  }

  const rows = enrolledStudents.flatMap((enrollment) => subjectIds.map((subjectId) => ({
    school_id: user.schoolId,
    class_id: enrollment.classId,
    student_id: enrollment.studentId,
    subject_id: subjectId,
    enrolled_by: user.id
  })));
  if (!rows.length) return;

  const { error } = await admin.from("student_subject_enrollments").upsert(rows, {
    onConflict: "school_id,student_id,subject_id,class_id"
  });
  if (error) throw new Error(error.message);
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

export async function deleteDefaultStudentSubjectCombination(
  user: AppUser,
  values: { combinationKey: string; gradeId: string }
) {
  const supabase = await createClient();
  if (!isDefaultStudentMajor(values.combinationKey)) throw new Error("That default combination is not available.");

  const [{ data: grade, error: gradeError }, { data: classes, error: classesError }, { data: existing, error: existingError }] = await Promise.all([
    supabase.from("grades").select("id").eq("school_id", user.schoolId).eq("id", values.gradeId).maybeSingle(),
    supabase.from("classes").select("id").eq("school_id", user.schoolId).eq("grade_id", values.gradeId),
    supabase
      .from("student_subject_combinations")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("grade_id", values.gradeId)
      .eq("combination_key", values.combinationKey)
      .maybeSingle()
  ]);
  if (gradeError) throw new Error(gradeError.message);
  if (classesError) throw new Error(classesError.message);
  if (existingError) throw new Error(existingError.message);
  if (!grade) throw new Error("Selected grade could not be found.");

  const result = existing
    ? await supabase
      .from("student_subject_combinations")
      .update({ is_active: false })
      .eq("school_id", user.schoolId)
      .eq("id", existing.id)
      .select("id")
      .single()
    : await supabase
      .from("student_subject_combinations")
      .insert({
        school_id: user.schoolId,
        grade_id: values.gradeId,
        combination_key: values.combinationKey,
        name: "Hidden default combination",
        is_active: false
      })
      .select("id")
      .single();
  if (result.error) throw new Error(result.error.message);

  const combinationId = result.data.id as string;
  const { error: clearLinksError } = await supabase
    .from("student_subject_combination_classes")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("combination_id", combinationId);
  if (clearLinksError) throw new Error(clearLinksError.message);

  const classIds = (classes ?? []).map((classRow: any) => classRow.id as string);
  if (classIds.length) {
    const { error: classLinksError } = await supabase.from("student_subject_combination_classes").insert(classIds.map((classId) => ({
      school_id: user.schoolId,
      combination_id: combinationId,
      class_id: classId
    })));
    if (classLinksError) throw new Error(classLinksError.message);
  }
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

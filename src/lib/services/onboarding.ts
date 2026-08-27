import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import {
  DEFAULT_GRADE_NAMES,
  DEFAULT_SECTION_NAME
} from "@/lib/constants/onboarding";
import { canonicalSubjectName, getAllUniqueDefaultSubjectNames, isHighSchoolGrade } from "@/lib/constants/subjectDefaults";
import { createGrade, createSection, seedDefaultSubjectsForClass } from "@/lib/services/academics";
import { logActivity } from "@/lib/services/activity";

export async function getOnboardingStatus(user: AppUser) {
  const supabase = await createClient();
  const [schoolResult, classCountResult, teacherCountResult] = await Promise.all([
    supabase.from("schools").select("onboarding_completed_at").eq("id", user.schoolId).maybeSingle(),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId),
    supabase
      .from("school_members")
      .select("id", { count: "exact", head: true })
      .eq("school_id", user.schoolId)
      .in("role", ["teacher", "head_teacher"])
      .eq("status", "active")
  ]);

  if (schoolResult.error) {
    if (schoolResult.error.code === "42703") {
      return { completed: true, classCount: classCountResult.count ?? 0, teacherCount: teacherCountResult.count ?? 0 };
    }
    throw new Error(schoolResult.error.message);
  }

  return {
    completed: Boolean(schoolResult.data?.onboarding_completed_at),
    classCount: classCountResult.count ?? 0,
    teacherCount: teacherCountResult.count ?? 0
  };
}

async function resolveHeadTeacherId(user: AppUser, preferredTeacherId?: string) {
  if (!preferredTeacherId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_members")
    .select("user_id")
    .eq("school_id", user.schoolId)
    .eq("user_id", preferredTeacherId)
    .in("role", ["teacher", "head_teacher"])
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

async function getOrCreateActiveAcademicYear(user: AppUser) {
  const supabase = await createClient();
  const { data: activeYear, error: activeError } = await supabase
    .from("academic_years")
    .select("id,name")
    .eq("school_id", user.schoolId)
    .eq("is_active", true)
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) throw new Error(activeError.message);
  if (activeYear) return activeYear;

  const year = new Date().getFullYear();
  const name = `${year}-${year + 1}`;
  const { data: created, error } = await supabase
    .from("academic_years")
    .insert({
      school_id: user.schoolId,
      name,
      starts_on: `${year}-09-01`,
      ends_on: `${year + 1}-06-30`,
      is_active: true
    })
    .select("id,name")
    .single();

  if (error) throw new Error(error.message);
  return created;
}

export async function runOnboardingGradeSetup(
  user: AppUser,
  values: { selectedGrades: string[]; customGradeNames?: string[]; defaultHeadTeacherId?: string }
) {
  const requestedGrades = [...new Map(
    [...values.selectedGrades, ...(values.customGradeNames ?? [])]
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => [name.toLocaleLowerCase(), name])
  ).values()];

  if (!requestedGrades.length) {
    throw new Error("Select at least one grade to continue.");
  }

  const supabase = await createClient();
  const headTeacherId = await resolveHeadTeacherId(user, values.defaultHeadTeacherId);
  const academicYear = await getOrCreateActiveAcademicYear(user);

  const { data: existingGrades, error: gradesError } = await supabase
    .from("grades")
    .select("id,name,sort_order")
    .eq("school_id", user.schoolId);
  if (gradesError) throw new Error(gradesError.message);

  const gradeMap = new Map((existingGrades ?? []).map((grade) => [grade.name.toLocaleLowerCase(), grade.id]));
  const duplicateCustom = (values.customGradeNames ?? []).map((name) => name.trim()).find((name) => gradeMap.has(name.toLocaleLowerCase()));
  if (duplicateCustom) throw new Error(`“${duplicateCustom}” already exists.`);
  for (const gradeName of requestedGrades) {
    const key = gradeName.toLocaleLowerCase();
    if (gradeMap.has(key)) continue;
    const defaultIndex = DEFAULT_GRADE_NAMES.findIndex((name) => name.toLocaleLowerCase() === key);
    const created = await createGrade(user, { name: gradeName, sort_order: defaultIndex >= 0 ? defaultIndex + 1 : 100 });
    gradeMap.set(key, created.id);
  }

  const { data: existingSections, error: sectionsError } = await supabase
    .from("sections")
    .select("id,name")
    .eq("school_id", user.schoolId);
  if (sectionsError) throw new Error(sectionsError.message);

  let sectionId = (existingSections ?? []).find((section) => section.name === DEFAULT_SECTION_NAME)?.id;
  if (!sectionId) {
    const createdSection = await createSection(user, { name: DEFAULT_SECTION_NAME });
    sectionId = createdSection.id;
  }

  const createdClassIds: string[] = [];
  const classSummaries: Array<{ id: string; name: string; grade_name: string; section_name: string | null }> = [];
  const seededSubjectsByGrade: Record<string, number> = {};

  for (const gradeName of requestedGrades) {
    const gradeId = gradeMap.get(gradeName.toLocaleLowerCase());
    if (!gradeId) continue;

    const className = `${gradeName} ${DEFAULT_SECTION_NAME}`;
    const { data: existingClass, error: existingClassError } = await supabase
      .from("classes")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("academic_year_id", academicYear.id)
      .eq("grade_id", gradeId)
      .eq("section_id", sectionId)
      .maybeSingle();
    if (existingClassError) throw new Error(existingClassError.message);

    let classId = existingClass?.id;
    if (!classId) {
      const { data: createdClass, error: createClassError } = await supabase
        .from("classes")
        .insert({
          school_id: user.schoolId,
          academic_year_id: academicYear.id,
          grade_id: gradeId,
          section_id: sectionId,
          name: className,
          ...(headTeacherId ? { head_teacher_id: headTeacherId } : {})
        })
        .select("id")
        .single();
      if (createClassError) throw new Error(createClassError.message);
      classId = createdClass.id;
    }

    createdClassIds.push(classId);
    classSummaries.push({
      id: classId,
      name: className,
      grade_name: gradeName,
      section_name: DEFAULT_SECTION_NAME
    });

    const seedResult = await seedDefaultSubjectsForClass(user, classId, gradeName);
    seededSubjectsByGrade[gradeName] = seedResult.linkedCount;
  }

  await logActivity(user, "onboarding_grades_setup", "school", user.schoolId, {
    grades: requestedGrades,
    classes_created: createdClassIds.length,
    subjects_seeded: seededSubjectsByGrade
  });

  return { classIds: createdClassIds, classSummaries, academicYearId: academicYear.id, sectionId, seededSubjectsByGrade };
}

export async function runOnboardingSubjectSetup(
  user: AppUser,
  values: {
    customSubjects?: string[];
    classIds?: string[];
  }
) {
  const supabase = await createClient();
  const subjectNames = [...new Set((values.customSubjects ?? []).map((name) => name.trim()).filter(Boolean))];
  if (!subjectNames.length) {
    return { subjectIds: [], classCount: 0 };
  }

  const { data: existingSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id,name,is_elective")
    .eq("school_id", user.schoolId);
  if (subjectsError) throw new Error(subjectsError.message);

  const subjectMap = new Map((existingSubjects ?? []).map((subject) => [canonicalSubjectName(subject.name), subject.id]));
  const subjectIds: string[] = [];

  for (const subjectName of subjectNames) {
    const existingId = subjectMap.get(canonicalSubjectName(subjectName));
    if (existingId) {
      subjectIds.push(existingId);
      continue;
    }

    const { data: createdSubject, error } = await supabase
      .from("subjects")
      .insert({
        school_id: user.schoolId,
        name: subjectName,
        is_elective: false
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    subjectMap.set(canonicalSubjectName(subjectName), createdSubject.id);
    subjectIds.push(createdSubject.id);
  }

  let targetClassIds = values.classIds ?? [];
  if (!targetClassIds.length) {
    const { data: classes, error } = await supabase.from("classes").select("id").eq("school_id", user.schoolId);
    if (error) throw new Error(error.message);
    targetClassIds = (classes ?? []).map((row) => row.id);
  }

  if (!targetClassIds.length) {
    throw new Error("No classes found. Complete grade setup first.");
  }

  const links = targetClassIds.flatMap((classId) =>
    subjectIds.map((subjectId) => ({
      school_id: user.schoolId,
      class_id: classId,
      subject_id: subjectId,
      is_class_specific: true
    }))
  );

  const { error: linkError } = await supabase.from("class_subjects").upsert(links, {
    onConflict: "school_id,class_id,subject_id"
  });
  if (linkError && linkError.code !== "42P01") throw new Error(linkError.message);

  await logActivity(user, "onboarding_subjects_setup", "school", user.schoolId, {
    subjects: subjectNames,
    classes: targetClassIds.length
  });

  return { subjectIds, classCount: targetClassIds.length };
}

export async function completeOnboarding(user: AppUser) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.schoolId);
  if (error) throw new Error(error.message);
  await logActivity(user, "onboarding_completed", "school", user.schoolId);
}

export { isHighSchoolGrade };

export function getDefaultSubjectNames() {
  return getAllUniqueDefaultSubjectNames();
}

export function getDefaultGradeNames() {
  return [...DEFAULT_GRADE_NAMES];
}

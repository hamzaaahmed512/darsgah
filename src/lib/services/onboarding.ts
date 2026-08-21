import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import {
  DEFAULT_CORE_SUBJECTS,
  DEFAULT_GRADE_NAMES,
  DEFAULT_SECTION_NAME,
  HIGH_SCHOOL_GRADE_NAMES
} from "@/lib/constants/onboarding";
import { createGrade, createSection } from "@/lib/services/academics";
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
  values: { selectedGrades: string[]; defaultHeadTeacherId?: string }
) {
  if (!values.selectedGrades.length) {
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

  const gradeMap = new Map((existingGrades ?? []).map((grade) => [grade.name, grade.id]));
  for (const [index, gradeName] of DEFAULT_GRADE_NAMES.entries()) {
    if (!values.selectedGrades.includes(gradeName) || gradeMap.has(gradeName)) continue;
    const created = await createGrade(user, { name: gradeName, sort_order: index + 1 });
    gradeMap.set(gradeName, created.id);
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
  for (const gradeName of values.selectedGrades) {
    const gradeId = gradeMap.get(gradeName);
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

    if (existingClass?.id) {
      createdClassIds.push(existingClass.id);
      continue;
    }

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
    createdClassIds.push(createdClass.id);
  }

  await logActivity(user, "onboarding_grades_setup", "school", user.schoolId, {
    grades: values.selectedGrades,
    classes_created: createdClassIds.length
  });

  return { classIds: createdClassIds, academicYearId: academicYear.id, sectionId };
}

export async function runOnboardingSubjectSetup(
  user: AppUser,
  values: {
    selectedSubjects: string[];
    customSubjects?: string[];
    applyToAllClasses: boolean;
    classIds?: string[];
    electiveSubjectNames?: string[];
  }
) {
  const supabase = await createClient();
  const subjectNames = [...new Set([...values.selectedSubjects, ...(values.customSubjects ?? [])].map((name) => name.trim()).filter(Boolean))];
  if (!subjectNames.length) {
    throw new Error("Select at least one subject to continue.");
  }

  const electiveNames = new Set((values.electiveSubjectNames ?? []).map((name) => name.trim()).filter(Boolean));

  const { data: existingSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id,name,is_elective")
    .eq("school_id", user.schoolId);
  if (subjectsError) throw new Error(subjectsError.message);

  const subjectMap = new Map((existingSubjects ?? []).map((subject) => [subject.name.toLowerCase(), subject.id]));
  const subjectIds: string[] = [];

  for (const subjectName of subjectNames) {
    const existingId = subjectMap.get(subjectName.toLowerCase());
    if (existingId) {
      subjectIds.push(existingId);
      continue;
    }

    const { data: createdSubject, error } = await supabase
      .from("subjects")
      .insert({
        school_id: user.schoolId,
        name: subjectName,
        is_elective: electiveNames.has(subjectName)
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    subjectMap.set(subjectName.toLowerCase(), createdSubject.id);
    subjectIds.push(createdSubject.id);
  }

  let targetClassIds = values.classIds ?? [];
  if (values.applyToAllClasses) {
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
      is_class_specific: false
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

export function isHighSchoolGrade(gradeName: string) {
  return HIGH_SCHOOL_GRADE_NAMES.has(gradeName);
}

export function getDefaultSubjectNames() {
  return [...DEFAULT_CORE_SUBJECTS];
}

export function getDefaultGradeNames() {
  return [...DEFAULT_GRADE_NAMES];
}

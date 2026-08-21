"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  completeOnboarding,
  getOnboardingStatus,
  runOnboardingGradeSetup,
  runOnboardingSubjectSetup
} from "@/lib/services/onboarding";

export async function getOnboardingStatusAction() {
  const user = await requireUser("classes:manage");
  return getOnboardingStatus(user);
}

export async function onboardingGradeSetupAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const selectedGrades = formData.getAll("grade").map(String);
  const defaultHeadTeacherId = String(formData.get("default_head_teacher_id") ?? "") || undefined;
  const result = await runOnboardingGradeSetup(user, { selectedGrades, defaultHeadTeacherId });
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/academics");
  return result;
}

export async function onboardingSubjectSetupAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const selectedSubjects = formData.getAll("subject").map(String);
  const customSubjects = formData.getAll("custom_subject").map(String).filter(Boolean);
  const applyToAllClasses = formData.get("apply_to_all_classes") !== "off";
  const classIds = formData.getAll("class_id").map(String).filter(Boolean);
  const electiveSubjectNames = formData.getAll("elective_subject").map(String).filter(Boolean);

  const result = await runOnboardingSubjectSetup(user, {
    selectedSubjects,
    customSubjects,
    applyToAllClasses,
    classIds,
    electiveSubjectNames
  });

  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/academics");
  return result;
}

export async function completeOnboardingAction() {
  const user = await requireUser("classes:manage");
  await completeOnboarding(user);
  revalidatePath("/", "layout");
}

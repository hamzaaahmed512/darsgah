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
  const customGradeNames = formData.getAll("custom_grade").map(String).filter(Boolean);
  const defaultHeadTeacherId = String(formData.get("default_head_teacher_id") ?? "") || undefined;
  const result = await runOnboardingGradeSetup(user, { selectedGrades, customGradeNames, defaultHeadTeacherId });
  revalidatePath("/classes");
  revalidatePath("/subjects");
  revalidatePath("/academics");
  return result;
}

export async function onboardingSubjectSetupAction(formData: FormData) {
  const user = await requireUser("classes:manage");
  const customSubjects = formData.getAll("custom_subject").map(String).filter(Boolean);
  const classIds = formData.getAll("class_id").map(String).filter(Boolean);

  const result = await runOnboardingSubjectSetup(user, {
    customSubjects,
    classIds: classIds.length ? classIds : undefined
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

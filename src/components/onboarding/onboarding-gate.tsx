"use client";

import { useEffect, useState, useTransition } from "react";
import { getOnboardingStatusAction } from "@/app/(app)/onboarding/actions";
import { SchoolOnboardingWizard } from "@/components/onboarding/SchoolOnboardingWizard";

type TeacherOption = { user_id: string; full_name: string };

export function OnboardingGate({
  userRole,
  teachers,
  children
}: {
  userRole: string;
  teachers: TeacherOption[];
  children: React.ReactNode;
}) {
  const [showWizard, setShowWizard] = useState(false);
  const [checking, startChecking] = useTransition();

  useEffect(() => {
    if (userRole !== "principal") return;
    startChecking(async () => {
      try {
        const status = await getOnboardingStatusAction();
        setShowWizard(!status.completed && status.classCount === 0);
      } catch {
        setShowWizard(false);
      }
    });
  }, [userRole]);

  return (
    <>
      {children}
      {!checking && showWizard ? <SchoolOnboardingWizard teachers={teachers} forceOpen /> : null}
    </>
  );
}

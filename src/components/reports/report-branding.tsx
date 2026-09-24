"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ReportSchool } from "./profile-report-types";

const ReportBrandingContext = createContext<ReportSchool>({});
export function ReportBrandingProvider({ school, children }: { school: ReportSchool; children: ReactNode }) {
  return <ReportBrandingContext.Provider value={school}>{children}</ReportBrandingContext.Provider>;
}
export function useReportBranding() { return useContext(ReportBrandingContext); }

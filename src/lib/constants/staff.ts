export const OTHER_STAFF_CATEGORIES = ["peon", "guard", "cleaner", "driver", "office_assistant", "other"] as const;
export type OtherStaffCategory = (typeof OTHER_STAFF_CATEGORIES)[number];

export const OTHER_STAFF_CATEGORY_LABELS: Record<OtherStaffCategory, string> = {
  peon: "Peon",
  guard: "Guard",
  cleaner: "Cleaner",
  driver: "Driver",
  office_assistant: "Office Assistant",
  other: "Other"
};

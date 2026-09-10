"use client";

import { useState } from "react";
import { ClassGradeGroup } from "@/components/classes/class-grade-group";

export function ClassGradeList({ groups, classDetails }: { groups: Array<{ gradeName: string; classes: any[] }>; classDetails: any }) {
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <ClassGradeGroup
          key={group.gradeName}
          gradeName={group.gradeName}
          classes={group.classes}
          classDetails={classDetails}
          expanded={expandedGrade === group.gradeName}
          onExpandedChange={(expanded) => setExpandedGrade(expanded ? group.gradeName : null)}
        />
      ))}
    </div>
  );
}

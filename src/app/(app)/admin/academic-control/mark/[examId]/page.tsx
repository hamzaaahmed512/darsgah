import { MarkAssessmentView } from "@/components/marks/mark-assessment-view";

export default async function PrincipalMarkAssessmentPage(props: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <MarkAssessmentView {...props} basePath="/admin/academic-control" />;
}


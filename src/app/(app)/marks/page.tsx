import { AssessmentsView } from "@/components/marks/assessments-view";

export default async function MarksPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <AssessmentsView {...props} />;
}

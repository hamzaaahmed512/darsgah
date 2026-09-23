import { PageHeader } from "@/components/layout/page-header";
import { LibrarySummary } from "@/components/library/library-summary";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return <>
    <PageHeader eyebrow="Operations" title="Library" />
    <div className="space-y-6">
      <LibrarySummary />
      <Skeleton className="h-12 w-full motion-reduce:animate-none" />
      <Skeleton className="h-64 w-full motion-reduce:animate-none" />
    </div>
  </>;
}

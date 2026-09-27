import { Skeleton } from "@/components/ui/skeleton";
export default function StudentRecordLoading() { return <div className="space-y-5"><Skeleton className="h-24" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-72" /><Skeleton className="h-80" /></div>; }

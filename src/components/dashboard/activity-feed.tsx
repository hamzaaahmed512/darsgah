import { formatDistanceToNow } from "date-fns";
import { formatDisplayName } from "@/lib/student-name";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function ActivityFeed({ items }: { items: any[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!items.length ? (
          <EmptyState title="No activity yet" description="Important events will be logged here." />
        ) : (
          <ol className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{humanize(item.action)}</p>
                  <p className="text-xs leading-5 text-muted">
                    {formatDisplayName(item.profiles?.full_name) || "System"} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function humanize(action: string) {
  return action.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

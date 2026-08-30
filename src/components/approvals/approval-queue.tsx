"use client";

import { useState } from "react";
import { ReviewModal } from "./review-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApprovalRequest } from "@/types/database";
import { formatFullName } from "@/lib/student-name";

export function ApprovalQueue({ initialRequests, canReview }: { initialRequests: ApprovalRequest[]; canReview: boolean }) {
  const requests = initialRequests;
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="font-label text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-3 pr-4">Request Type</th>
              <th className="py-3 pr-4">Student</th>
              <th className="py-3 pr-4">Submitted By</th>
              <th className="py-3 pr-4">Date Submitted</th>
              <th className="py-3 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  No pending requests in the queue.
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="border-t border-outline/60">
                  <td className="py-3 pr-4">
                    <Badge tone={request.request_type === "admission" ? "blue" : "yellow"}>
                      {request.request_type}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold">{formatFullName(request.student_first_name, request.student_last_name)}</div>
                    <div className="text-xs text-muted">{request.student_admission_number}</div>
                  </td>
                  <td className="py-3 pr-4">{request.submitted_by_name}</td>
                  <td className="py-3 pr-4">
                    {new Date(request.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {canReview ? (
                      <Button onClick={() => setSelectedRequest(request)} variant="secondary" size="sm">
                        Review
                      </Button>
                    ) : (
                      <Badge tone={request.status === "pending" ? "yellow" : "gray"}>{request.status}</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <ReviewModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </>
  );
}

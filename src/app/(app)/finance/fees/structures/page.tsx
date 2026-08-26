import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions } from "@/lib/services/academics";
import { getFeeStructures } from "@/lib/services/finance";
import { PageHeader } from "@/components/layout/page-header";
import { FeeStructuresClient } from "@/components/finance/fee-structures-client";

export default async function FeeStructuresPage() {
  const user = await requireUser("finance:view");
  const [academics, structures] = await Promise.all([
    getAcademicOptions(user),
    getFeeStructures(user)
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Fee Structures"
        description="Review current fee structures and add or update class billing templates."
        actions={
          <Link href="/finance/fees" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-primary ring-1 ring-outline hover:bg-primary-soft">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Fee Management
          </Link>
        }
      />
      <FeeStructuresClient
        user={user}
        classes={academics.classes}
        sessions={academics.years}
        structures={structures}
      />
    </>
  );
}

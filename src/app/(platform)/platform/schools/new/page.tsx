import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformHeader } from "@/components/platform/platform-ui";
import { CreateSchoolForm } from "@/components/platform/create-school-form";

export const metadata: Metadata = { title: "Add school | GetDarsgah platform" };
export default function NewSchoolPage() { 
  return (
    <>
      <PlatformHeader eyebrow="Tenant onboarding" title="Add a school" description="Create the tenant, initial principal login, and subscription record in one setup." action={<Link href="/platform/schools" className="inline-flex items-center gap-2 text-sm font-bold text-muted"><ArrowLeft className="h-4 w-4" />Back</Link>} />
      <CreateSchoolForm />
    </>
  ); 
}

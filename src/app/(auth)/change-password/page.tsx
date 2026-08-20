import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function ChangePasswordPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [params, supabase] = await Promise.all([searchParams, createClient()]);
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/sign-in");

  return <ChangePasswordForm next={params.next} />;
}

import { redirect } from "next/navigation";

export default async function TeacherProfileRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/staff/${id}`);
}

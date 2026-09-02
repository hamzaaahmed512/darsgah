"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form-field";

type Props = {
  customRoles?: { id: string; name: string }[];
};

export function StaffFilterForm({ customRoles = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushFilters = useCallback(
    (role: string, q: string) => {
      const params = new URLSearchParams();
      if (role && role !== "all") params.set("role", role);
      if (q) params.set("q", q);
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    },
    [pathname, router]
  );

  const currentRole = searchParams.get("role") ?? "all";
  const currentQ = searchParams.get("q") ?? "";

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    pushFilters(e.target.value, searchRef.current?.value ?? currentQ);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = e.target.value;
    debounceRef.current = setTimeout(() => {
      pushFilters(currentRole, q);
    }, 350);
  }

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          ref={searchRef}
          name="q"
          defaultValue={currentQ}
          onChange={handleSearchChange}
          className="h-14 rounded-2xl border-outline/70 bg-white pl-12 text-base shadow-none"
          placeholder="Search staff by name, email, or department"
        />
      </div>
      <Select
        name="role"
        defaultValue={currentRole}
        onChange={handleRoleChange}
        className="h-14 rounded-2xl border-outline/70 bg-white text-base shadow-none"
      >
        <option value="all">All roles</option>
        <option value="administrator">Administrators</option>
        <option value="principal">Principals</option>
        <option value="teacher">Teachers</option>
        <option value="student_staff">Registrars / Student Staff</option>
        <option value="other">Others</option>
        {customRoles.map((cr) => (
          <option key={cr.id} value={cr.id}>
            {cr.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

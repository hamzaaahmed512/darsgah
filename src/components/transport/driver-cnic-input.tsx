"use client";

import { Input } from "@/components/ui/form-field";
import { formatCnic } from "@/lib/pakistan-format";

export function DriverCnicInput() {
  return <Input name="cnic" required inputMode="numeric" maxLength={15} placeholder="00000-0000000-0"
    onChange={(event) => { event.currentTarget.value = formatCnic(event.currentTarget.value); }} />;
}

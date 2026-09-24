"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintProfileButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => window.print()}
      className="gap-2 print:hidden"
    >
      <Printer className="h-4 w-4 text-primary" />
      <span>Download PDF</span>
    </Button>
  );
}

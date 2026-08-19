import Image from "next/image";
import { cn } from "@/lib/utils";

export function GetDarsgahLogo({ className, imageClassName, priority = false }: { className?: string; imageClassName?: string; priority?: boolean }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden", className)} aria-hidden="true">
      <Image
        src="/getdarsgah-logo.png"
        alt=""
        fill
        priority={priority}
        sizes="96px"
        className={cn("scale-[1.85] object-contain", imageClassName)}
      />
    </span>
  );
}

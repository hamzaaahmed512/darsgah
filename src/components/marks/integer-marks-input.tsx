"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/form-field";

export function IntegerMarksInput(props: InputHTMLAttributes<HTMLInputElement>) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    if (rawValue === "") return;

    const numericValue = Number(rawValue);
    if (Number.isFinite(numericValue)) {
      event.currentTarget.value = String(Math.trunc(numericValue));
    }

    props.onChange?.(event);
  }

  return <Input {...props} step="1" onChange={handleChange} />;
}

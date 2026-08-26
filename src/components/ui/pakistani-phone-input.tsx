"use client";

import type { ChangeEventHandler, ComponentProps } from "react";
import { Input } from "@/components/ui/form-field";
import { formatPakistaniPhone } from "@/lib/pakistan-format";

type Props = Omit<ComponentProps<typeof Input>, "onChange"> & {
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export function PakistaniPhoneInput({ onChange, ...props }: Props) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      maxLength={12}
      pattern={props.pattern ?? "03[0-9]{2}-[0-9]{7}"}
      placeholder={props.placeholder ?? "0300-0000000"}
      onChange={(event) => {
        event.currentTarget.value = formatPakistaniPhone(event.currentTarget.value);
        onChange?.(event);
      }}
    />
  );
}

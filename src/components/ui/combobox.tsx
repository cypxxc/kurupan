"use client";

import {
  CreatableCombobox,
  type ComboboxOption,
} from "@/components/ui/creatable-combobox";

type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaInvalid?: boolean;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา...",
  emptyText = "ไม่พบข้อมูล",
  disabled = false,
  className,
  id,
  ariaInvalid = false,
}: ComboboxProps) {
  return (
    <CreatableCombobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      disabled={disabled}
      className={className}
      id={id}
      ariaInvalid={ariaInvalid}
      allowCustomValue={false}
    />
  );
}

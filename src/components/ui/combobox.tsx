"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: React.ReactNode;
  searchLabel?: string;
};

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
}: ComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        nativeButton={false}
        render={
          <div
            role="combobox"
            aria-expanded={open}
            tabIndex={disabled ? -1 : 0}
            className={cn(
              "flex h-8 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent pl-2.5 pr-2 text-sm transition-colors outline-none select-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              disabled && "pointer-events-none cursor-not-allowed opacity-50",
              "dark:bg-input/30",
              className,
            )}
          />
        }
      >
        <span className={cn("flex flex-1 items-center text-left", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.searchLabel ?? (typeof opt.label === "string" ? opt.label : opt.value)}
                  onSelect={() => {
                    onChange?.(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

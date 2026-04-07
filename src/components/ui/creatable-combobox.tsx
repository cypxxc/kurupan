"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

type CreatableComboboxProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  maxLength?: number;
};

export function CreatableCombobox({
  options,
  value,
  onChange,
  placeholder,
  id,
  disabled = false,
  maxLength,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // sync ถ้า value เปลี่ยนจากภายนอก
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // ปิด dropdown เมื่อ click นอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        // commit ค่าที่พิมพ์
        onChange(inputValue);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, onChange]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const showCreate =
    inputValue.trim() !== "" &&
    !options.some((opt) => opt.toLowerCase() === inputValue.toLowerCase());

  const handleSelect = (opt: string) => {
    setInputValue(opt);
    onChange(opt);
    setOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          disabled={disabled}
          maxLength={maxLength}
          value={inputValue}
          placeholder={placeholder}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent pl-2.5 pr-14 py-1 text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
            "dark:bg-input/30",
          )}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) handleSelect(filtered[0]);
            }
          }}
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {inputValue && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <ul className="max-h-52 overflow-y-auto py-1 text-sm">
            {filtered.map((opt) => (
              <li
                key={opt}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={cn("size-3.5 shrink-0", opt === value ? "opacity-100" : "opacity-0")}
                />
                {opt}
              </li>
            ))}
            {showCreate && (
              <li
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(inputValue.trim())}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <span className="size-3.5 shrink-0" />
                <span>
                  สร้างใหม่: <strong className="text-foreground">"{inputValue.trim()}"</strong>
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: ReactNode;
  searchLabel?: string;
};

type CreatableComboboxOption = ComboboxOption | string;

type CreatableComboboxProps = {
  options: CreatableComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  id?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  ariaInvalid?: boolean;
  allowCustomValue?: boolean;
};

type NormalizedOption = {
  value: string;
  label: ReactNode;
  searchLabel: string;
};

function toSearchLabel(option: CreatableComboboxOption) {
  if (typeof option === "string") {
    return option;
  }

  if (option.searchLabel) {
    return option.searchLabel;
  }

  return typeof option.label === "string" ? option.label : option.value;
}

function normalizeOptions(options: CreatableComboboxOption[]): NormalizedOption[] {
  return options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option, searchLabel: option }
      : {
          value: option.value,
          label: option.label,
          searchLabel: toSearchLabel(option),
        },
  );
}

function inputShellClassName(className?: string, ariaInvalid?: boolean, disabled?: boolean) {
  return cn(
    "h-10 w-full min-w-0 rounded-xl border border-input/90 bg-background/75 py-2 pl-3.5 pr-14 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-[border-color,box-shadow,background-color] outline-none",
    "placeholder:text-muted-foreground/85 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/25",
    ariaInvalid && "border-destructive ring-2 ring-destructive/20 field-error-blink",
    disabled && "pointer-events-none cursor-not-allowed bg-input/50 opacity-50",
    "dark:bg-input/30 dark:shadow-none",
    className,
  );
}

export function CreatableCombobox({
  options,
  value = "",
  onChange,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา...",
  emptyText = "ไม่พบข้อมูล",
  id,
  disabled = false,
  maxLength,
  className,
  ariaInvalid = false,
  allowCustomValue = true,
}: CreatableComboboxProps) {
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const committedDisplayValue = selectedOption?.searchLabel ?? value;
  const listboxId = id ? `${id}-listbox` : undefined;

  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closingByInputClickRef = useRef(false);

  const getOpenDraftValue = () => (allowCustomValue ? committedDisplayValue : "");

  const closeDropdown = (commitCustomValue: boolean) => {
    setOpen(false);
    if (commitCustomValue && allowCustomValue) {
      onChange?.(draftValue.trim());
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        if (allowCustomValue) {
          onChange?.(draftValue.trim());
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowCustomValue, draftValue, onChange]);

  const inputValue = open ? draftValue : committedDisplayValue;
  const normalizedInput = inputValue.toLowerCase();

  const filtered = normalizedOptions.filter((option) =>
    option.searchLabel.toLowerCase().includes(normalizedInput),
  );

  const showCreate =
    allowCustomValue &&
    inputValue.trim() !== "" &&
    !normalizedOptions.some((option) => option.value.toLowerCase() === inputValue.trim().toLowerCase());

  const handleSelect = (nextValue: string) => {
    const matchedOption = normalizedOptions.find((option) => option.value === nextValue);
    setDraftValue(matchedOption?.searchLabel ?? nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  const handleClear = () => {
    setDraftValue("");
    onChange?.("");
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
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          disabled={disabled}
          readOnly={!allowCustomValue && !open}
          maxLength={maxLength}
          value={inputValue}
          placeholder={open ? searchPlaceholder : placeholder}
          aria-invalid={ariaInvalid || undefined}
          className={inputShellClassName(className, ariaInvalid, disabled)}
          onMouseDown={(event) => {
            if (disabled) {
              return;
            }

            const isFocused = document.activeElement === inputRef.current;

            if (open) {
              closingByInputClickRef.current = true;
              event.preventDefault();
              closeDropdown(false);
              return;
            }

            if (isFocused) {
              event.preventDefault();
              setDraftValue(getOpenDraftValue());
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (closingByInputClickRef.current) {
                closingByInputClickRef.current = false;
                return;
              }

              const nextActive = document.activeElement;
              if (!containerRef.current?.contains(nextActive)) {
                closeDropdown(true);
              }
            }, 0);
          }}
          onFocus={() => {
            setDraftValue(getOpenDraftValue());
            setOpen(true);
          }}
          onChange={(event) => {
            setDraftValue(event.target.value);
            if (allowCustomValue) {
              onChange?.(event.target.value);
            }
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault();
              setDraftValue(getOpenDraftValue());
              setOpen(true);
              return;
            }

            if (event.key === "Escape") {
              setDraftValue(committedDisplayValue);
              closeDropdown(false);
              return;
            }

            if (event.key === "Tab") {
              closeDropdown(true);
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();

              if (filtered[0]) {
                handleSelect(filtered[0].value);
                return;
              }

              if (showCreate) {
                handleSelect(inputValue.trim());
              }
            }
          }}
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {allowCustomValue && inputValue && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              aria-label="Clear value"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? "Close options" : "Open options"}
            onClick={() => {
              if (!open) {
                setDraftValue(getOpenDraftValue());
              }
              setOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-popover/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] backdrop-blur-xl">
          <ul id={listboxId} role="listbox" className="max-h-52 overflow-y-auto p-1 text-sm">
            {filtered.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option.value)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {option.label}
              </li>
            ))}
            {showCreate && (
              <li
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(inputValue.trim())}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <span className="size-3.5 shrink-0" />
                <span>
                  Create new:{" "}
                  <strong className="text-foreground">&quot;{inputValue.trim()}&quot;</strong>
                </span>
              </li>
            )}
            {filtered.length === 0 && !showCreate ? (
              <li className="px-3 py-2 text-muted-foreground">{emptyText}</li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}

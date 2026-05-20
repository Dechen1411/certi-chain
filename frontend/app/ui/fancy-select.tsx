import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "./utils";

type SelectTone = "blue" | "green" | "amber" | "purple" | "slate";

export type FancySelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: LucideIcon;
  tone?: SelectTone;
};

const toneClasses: Record<SelectTone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  purple: "border-violet-100 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

type FancySelectProps = {
  id?: string;
  value: string;
  placeholder: string;
  options: FancySelectOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function FancySelect({
  id,
  value,
  placeholder,
  options,
  onChange,
  className,
}: FancySelectProps) {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const SelectedIcon = selectedOption?.icon;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition",
          "hover:border-slate-300 hover:bg-slate-50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold",
              selectedOption ? toneClasses[selectedOption.tone || "slate"] : toneClasses.slate,
            )}
          >
            {SelectedIcon ? <SelectedIcon className="h-4 w-4" /> : selectedOption?.badge || "--"}
          </span>
          <span className="min-w-0">
            <span className={cn("block truncate text-sm font-semibold", selectedOption ? "text-gray-950" : "text-gray-500")}>
              {selectedOption?.label || placeholder}
            </span>
            {selectedOption?.description && (
              <span className="block truncate text-xs text-gray-500">{selectedOption.description}</span>
            )}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={buttonId}
          className="absolute z-40 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const OptionIcon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition",
                  isSelected ? "bg-slate-100" : "hover:bg-slate-50",
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold",
                      toneClasses[option.tone || "slate"],
                    )}
                  >
                    {OptionIcon ? <OptionIcon className="h-4 w-4" /> : option.badge || "--"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-950">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-gray-500">{option.description}</span>
                    )}
                  </span>
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

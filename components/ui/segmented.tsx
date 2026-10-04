"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: string }

/** Control segmentado accesible (grupo de radios con aspecto de pestañas). */
export function Segmented<T extends string>({
  name,
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  name: string
  value: T
  onValueChange: (value: T) => void
  options: readonly Option<T>[]
  className?: string
  "aria-label"?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "grid auto-cols-fr grid-flow-col gap-1 rounded-[11px] bg-muted p-1",
        className
      )}
    >
      {options.map((option) => {
        const checked = option.value === value
        return (
          <label
            key={option.value}
            className={cn(
              "relative flex h-8 cursor-pointer items-center justify-center rounded-lg text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-150 select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
              checked
                ? "bg-card text-foreground shadow-[0_1px_2px_oklch(0.3_0.02_75/0.1),0_0_0_1px_oklch(0.3_0.02_75/0.05)] dark:bg-secondary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onValueChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}

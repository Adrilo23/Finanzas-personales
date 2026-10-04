import * as React from "react"

import { cn } from "@/lib/utils"

/** Campo de importe destacado, con el símbolo € fijo a la derecha. */
function AmountInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        data-slot="amount-input"
        className={cn(
          "num h-14 w-full rounded-xl border border-input bg-card pr-10 pl-4 text-[1.625rem] font-semibold tracking-[-0.02em] shadow-[0_1px_1px_oklch(0.4_0.02_75/0.03)] transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive dark:bg-input/30",
          className
        )}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg font-medium text-muted-foreground"
      >
        €
      </span>
    </div>
  )
}

export { AmountInput }

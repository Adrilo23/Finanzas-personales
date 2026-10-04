import * as React from "react"
import { CircleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn("grid gap-1.5", className)} {...props} />
}

function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />
}

function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p role="alert" className={cn("text-[0.8125rem] text-destructive", className)} {...props}>
      {children}
    </p>
  )
}

/** Error general del formulario (por ejemplo, el devuelto por una Server Action). */
function FormError({ className, children, ...props }: React.ComponentProps<"div">) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg bg-negative-soft px-3 py-2.5 text-[0.8125rem] text-negative",
        className
      )}
      {...props}
    >
      <CircleAlertIcon aria-hidden className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export { Field, FieldHint, FieldError, FormError }

"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormError } from "@/components/ui/field"

type ConfirmDialogProps = {
  trigger: React.ReactNode
  title: string
  description: React.ReactNode
  confirmLabel?: string
  /** Si devuelve { error }, el diálogo sigue abierto y muestra el mensaje. */
  onConfirm: () => Promise<{ error?: string } | void | undefined>
}

/** Sustituye a window.confirm(): confirmación accesible y con estado de carga. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader className="pr-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <FormError>{error}</FormError>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90 dark:text-[oklch(0.18_0.01_25)]"
            disabled={isPending}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const result = await onConfirm()
                if (result && result.error) {
                  setError(result.error)
                  return
                }
                setOpen(false)
              })
            }}
          >
            {isPending ? "Eliminando…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

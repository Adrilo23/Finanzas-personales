'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { categorySchema, type CategoryInput } from '@/lib/validation/category-schemas'
import { createCategory } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { Field, FieldError, FormError } from '@/components/ui/field'
import { CATEGORY_TYPE_META } from '@/components/category-type'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type CategoryOption = { id: string; name: string; type: string; parent_id: string | null }

const TYPE_OPTIONS = (['expense', 'income', 'investment'] as const).map((value) => ({
  value,
  label: CATEGORY_TYPE_META[value].label,
}))

export function NewCategoryDialog({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: 'expense', parentId: '', icon: '' },
  })

  const selectedType = useWatch({ control, name: 'type' })
  const possibleParents = categories.filter(
    (c) => c.type === selectedType && c.parent_id === null
  )

  const onSubmit = async (data: CategoryInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('type', data.type)
    formData.set('parentId', data.parentId ?? '')
    formData.set('icon', data.icon ?? '')

    const result = await createCategory(formData)
    if (result?.error) {
      setServerError(result.error)
      return
    }
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setServerError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Nueva categoría
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>
            El tipo decide si sus movimientos suman (ingreso) o restan (gasto e inversión).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Field>
            <Label>Tipo</Label>
            <Segmented
              name="type"
              aria-label="Tipo de categoría"
              value={selectedType}
              onValueChange={(value) => {
                setValue('type', value)
                setValue('parentId', '')
              }}
              options={TYPE_OPTIONS}
            />
          </Field>

          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
            <Field>
              <Label htmlFor="icon">Icono</Label>
              <Input
                id="icon"
                placeholder="🛒"
                maxLength={10}
                className="text-center text-lg"
                aria-invalid={!!errors.icon}
                {...register('icon')}
              />
            </Field>
            <Field>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Ej. Supermercado"
                autoFocus
                aria-invalid={!!errors.name}
                {...register('name')}
              />
            </Field>
          </div>
          <FieldError className="-mt-2">{errors.name?.message ?? errors.icon?.message}</FieldError>

          <Field>
            <Label htmlFor="parentId">
              Dentro de <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <NativeSelect id="parentId" {...register('parentId')}>
              <option value="">Ninguna — categoría principal</option>
              {possibleParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <FormError>{serverError}</FormError>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Crear categoría'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

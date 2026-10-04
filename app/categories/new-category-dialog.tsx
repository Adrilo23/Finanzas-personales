'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { categorySchema, type CategoryInput } from '@/lib/validation/category-schemas'
import { createCategory, updateCategory } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Segmented } from '@/components/ui/segmented'
import { Field, FieldError, FieldHint, FormError } from '@/components/ui/field'
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

export type EditableCategory = {
  id: string
  name: string
  type: CategoryInput['type']
  parentId: string | null
  icon: string | null
}

/** Diálogo de alta de categorías; con `category`, edita esa categoría (salvo el tipo). */
export function NewCategoryDialog({
  categories,
  category,
  trigger,
}: {
  categories: CategoryOption[]
  category?: EditableCategory
  trigger?: React.ReactNode
}) {
  const editing = Boolean(category)
  const hasChildren = category ? categories.some((c) => c.parent_id === category.id) : false
  const initialValues = (): Partial<CategoryInput> =>
    category
      ? {
          name: category.name,
          type: category.type,
          parentId: category.parentId ?? '',
          icon: category.icon ?? '',
        }
      : { type: 'expense', parentId: '', icon: '' }

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
    defaultValues: initialValues(),
  })

  const selectedType = useWatch({ control, name: 'type' })
  const possibleParents = categories.filter(
    (c) => c.type === selectedType && c.parent_id === null && c.id !== category?.id
  )

  const onSubmit = async (data: CategoryInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('type', data.type)
    formData.set('parentId', data.parentId ?? '')
    formData.set('icon', data.icon ?? '')

    const result = category
      ? await updateCategory(category.id, formData)
      : await createCategory(formData)
    if (result?.error) {
      setServerError(result.error)
      return
    }
    if (!category) reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setServerError(null)
        if (next && category) reset(initialValues())
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon data-icon="inline-start" />
            Nueva categoría
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Es de tipo ${CATEGORY_TYPE_META[selectedType].label.toLowerCase()}. El tipo no se puede cambiar porque decide el signo de los movimientos ya registrados.`
              : 'El tipo decide si sus movimientos suman (ingreso) o restan (gasto e inversión).'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          {!editing && (
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
          )}

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
                autoFocus={!editing}
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
            <NativeSelect id="parentId" disabled={hasChildren} {...register('parentId')}>
              <option value="">Ninguna — categoría principal</option>
              {possibleParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </NativeSelect>
            {hasChildren && (
              <FieldHint>Tiene subcategorías, así que debe seguir siendo principal.</FieldHint>
            )}
          </Field>

          <FormError>{serverError}</FormError>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

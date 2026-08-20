'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  categorySchema,
  type CategoryInput,
  CATEGORY_TYPE_LABELS,
} from '@/lib/validation/category-schemas'
import { createCategory } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type CategoryOption = { id: string; name: string; type: string; parent_id: string | null }

export function NewCategoryDialog({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: 'expense', parentId: '', icon: '' },
  })

  const selectedType = watch('type')
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nueva categoría</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              {...register('type')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="parentId">Categoría padre (opcional)</Label>
            <select
              id="parentId"
              {...register('parentId')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Ninguna (categoría de primer nivel)</option>
              {possibleParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
          </div>

          {serverError && <p className="text-sm text-red-500">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

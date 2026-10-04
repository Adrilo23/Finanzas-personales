'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { addHolding } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { Field, FieldHint, FormError } from '@/components/ui/field'
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

type AssetType = 'fund' | 'crypto'

const TYPE_OPTIONS = [
  { value: 'fund', label: 'Fondo o ETF' },
  { value: 'crypto', label: 'Criptomoneda' },
] as const

export function AddHoldingDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false)
  const [assetType, setAssetType] = useState<AssetType>('fund')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData()
    formData.set('assetType', assetType)
    formData.set(assetType === 'fund' ? 'isin' : 'ticker', code)
    const result = await addHolding(accountId, formData)
    setPending(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setCode('')
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Añadir activo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir activo</DialogTitle>
          <DialogDescription>
            Buscamos su nombre y su precio diario automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Segmented
            name="assetType"
            aria-label="Tipo de activo"
            value={assetType}
            onValueChange={(value) => {
              setAssetType(value)
              setCode('')
              setError(null)
            }}
            options={TYPE_OPTIONS}
          />

          <Field>
            <Label htmlFor="code">{assetType === 'fund' ? 'ISIN' : 'Código'}</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={assetType === 'fund' ? 'IE00BYX5NX33' : 'BTC'}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono uppercase"
              autoFocus
            />
            <FieldHint>
              {assetType === 'fund'
                ? 'Lo encontrarás en la ficha del fondo en tu bróker (12 caracteres).'
                : 'El código de la criptomoneda: BTC, ETH… Se valora en euros.'}
            </FieldHint>
          </Field>

          <FormError>{error}</FormError>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || code.trim() === ''}>
              {pending ? 'Buscando…' : 'Añadir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

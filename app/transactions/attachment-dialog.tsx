'use client'

import { useRef, useState } from 'react'
import { FileTextIcon, ImageIcon, PaperclipIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAttachment, deleteAttachment } from './attachments-actions'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Attachment = { id: string; file_name: string; storage_path: string }

const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function AttachmentDialog({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const loadAttachments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('attachments')
      .select('id, file_name, storage_path')
      .eq('transaction_id', transactionId)
      .order('uploaded_at', { ascending: false })
    setAttachments(data ?? [])
    setLoading(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    setError(null)
    setPendingDelete(null)
    if (next) loadAttachments()
  }

  const handleUpload = async (file: File) => {
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se admiten imágenes (JPG, PNG, WEBP) o PDF.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo no puede superar ${MAX_SIZE_MB} MB.`)
      return
    }

    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      setUploading(false)
      return
    }

    // Convención de ruta: {user_id}/{transaction_id}/... — es lo que
    // comprueban las políticas de Storage para dar acceso solo a lo propio.
    const path = `${user.id}/${transactionId}/${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const result = await createAttachment(transactionId, path, file.name)
    if (result?.error) {
      setError(result.error)
    } else {
      await loadAttachments()
    }
    setUploading(false)
  }

  const handleView = async (storagePath: string) => {
    const { data } = await supabase.storage.from('attachments').createSignedUrl(storagePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (id: string, storagePath: string) => {
    const result = await deleteAttachment(id, storagePath)
    setPendingDelete(null)
    if (result?.error) setError(result.error)
    await loadAttachments()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Tickets y facturas"
          className="text-muted-foreground"
        >
          <PaperclipIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tickets y facturas</DialogTitle>
          <DialogDescription>
            Imágenes o PDF de hasta {MAX_SIZE_MB} MB, guardados de forma privada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleUpload(file)
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border border-dashed border-input px-4 py-7 text-center transition-colors duration-150 outline-none hover:border-ring/60 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60',
              dragging && 'border-ring bg-brand-soft/60'
            )}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
              <UploadIcon aria-hidden className="size-4" />
            </span>
            <span className="text-sm font-medium">
              {uploading ? 'Subiendo archivo…' : 'Sube un archivo o arrástralo aquí'}
            </span>
            <span className="text-xs text-muted-foreground">JPG, PNG, WEBP o PDF</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
              e.target.value = ''
            }}
          />

          <FormError>{error}</FormError>

          {loading ? (
            <div className="space-y-2" aria-label="Cargando adjuntos">
              <div className="h-11 animate-pulse rounded-lg bg-muted" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/70" />
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Este movimiento todavía no tiene adjuntos.
            </p>
          ) : (
            <ul className="divide-y divide-border/70 rounded-xl ring-1 ring-border">
              {attachments.map((a) => {
                const isPdf = a.file_name.toLowerCase().endsWith('.pdf')
                const Icon = isPdf ? FileTextIcon : ImageIcon
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2 pr-2 pl-3">
                    <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => handleView(a.storage_path)}
                      className="min-w-0 flex-1 truncate rounded text-left text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      {a.file_name}
                    </button>
                    {pendingDelete === a.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(a.id, a.storage_path)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Eliminar ${a.file_name}`}
                        className="text-muted-foreground hover:bg-negative-soft hover:text-negative"
                        onClick={() => setPendingDelete(a.id)}
                      >
                        <Trash2Icon />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

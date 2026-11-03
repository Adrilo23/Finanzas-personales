'use client'

import { useRef, useState } from 'react'
import { FileTextIcon, ImageIcon, PaperclipIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import {
  createAttachment,
  deleteAttachment,
  getAttachmentUrl,
  listAttachments,
  prepareAttachmentUpload,
} from './attachments-actions'
import { ATTACHMENT_MAX_MB, ATTACHMENT_TYPES, validateAttachmentFile } from '@/lib/attachments'
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

type Attachment = { id: string; file_name: string }

const MAX_SIZE_MB = ATTACHMENT_MAX_MB

export function AttachmentDialog({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadAttachments = async () => {
    setLoading(true)
    setAttachments(await listAttachments(transactionId))
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
    const invalid = validateAttachmentFile(file)
    if (invalid) {
      setError(invalid)
      return
    }

    setUploading(true)
    try {
      // El servidor comprueba el movimiento y da una URL firmada para una ruta propia:
      // el navegador no usa la sesión de Supabase (la cookie es HttpOnly).
      const prepared = await prepareAttachmentUpload(transactionId, {
        name: file.name,
        type: file.type,
        size: file.size,
      })
      if ('error' in prepared) {
        setError(prepared.error ?? 'No se ha podido subir el archivo')
        return
      }

      // Mismo formato que uploadToSignedUrl de supabase-js. La anon key es pública.
      const body = new FormData()
      body.append('cacheControl', '3600')
      body.append('', file)
      const res = await fetch(prepared.signedUrl, {
        method: 'PUT',
        headers: { 'x-upsert': 'false', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body,
      })
      if (!res.ok) {
        setError('No se ha podido subir el archivo')
        return
      }

      const result = await createAttachment(transactionId, prepared.path, file.name)
      if (result?.error) setError(result.error)
      else await loadAttachments()
    } finally {
      setUploading(false)
    }
  }

  const handleView = async (id: string) => {
    // Se abre la pestaña antes de esperar al servidor para que no la bloquee el navegador.
    const tab = window.open('', '_blank')
    const result = await getAttachmentUrl(id)
    if ('url' in result && result.url) {
      if (tab) tab.location.href = result.url
      else window.open(result.url, '_blank')
    } else {
      tab?.close()
      setError(('error' in result && result.error) || 'No se ha podido abrir el adjunto')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteAttachment(id)
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
            accept={ATTACHMENT_TYPES.join(",")}
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
                      onClick={() => handleView(a.id)}
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
                          onClick={() => handleDelete(a.id)}
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

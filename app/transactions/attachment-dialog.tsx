'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createAttachment, deleteAttachment } from './attachments-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Attachment = { id: string; file_name: string; storage_path: string }

const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function AttachmentDialog({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (next) loadAttachments()
  }

  const handleUpload = async (file: File) => {
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se admiten imágenes (JPG, PNG, WEBP) o PDF')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo no puede superar ${MAX_SIZE_MB} MB`)
      return
    }

    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('No autenticado')
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
    if (!confirm('¿Eliminar este adjunto?')) return
    await deleteAttachment(id, storagePath)
    await loadAttachments()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Adjuntos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tickets y facturas</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
              e.target.value = ''
            }}
            className="text-sm"
          />
          {uploading && <p className="text-sm text-muted-foreground">Subiendo...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin adjuntos todavía.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between p-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleView(a.storage_path)}
                    className="truncate underline text-left"
                  >
                    {a.file_name}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id, a.storage_path)}>
                    Eliminar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

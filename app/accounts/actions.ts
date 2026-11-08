'use server'

import { createClient } from '@/lib/supabase/server'
import { NO_SESSION_ERROR, requireUser } from '@/lib/auth'
import { userError } from '@/lib/errors'
import { removeAttachmentFiles } from '@/lib/storage-cleanup'
import { accountSchema } from '@/lib/validation/account-schemas'
import { eurosToCents } from '@/lib/money'
import { firstOfNextMonth } from '@/lib/interest'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'

const today = () => format(new Date(), 'yyyy-MM-dd')

export async function createAccount(formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    currency: formData.get('currency') || 'EUR',
    initialBalance: Number(formData.get('initialBalance')),
    interestRate: formData.get('interestRate') ? Number(formData.get('interestRate')) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    currency: parsed.data.currency,
    initial_balance_cents: eurosToCents(parsed.data.initialBalance),
    // El primer abono de intereses es el día 1 del mes que viene.
    interest_rate: parsed.data.interestRate ?? null,
    interest_next_date: parsed.data.interestRate ? firstOfNextMonth(today()) : null,
  })

  if (error) {
    return { error: userError(error) }
  }

  revalidatePath('/accounts')
  return { success: true }
}

export async function updateAccount(id: string, formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    currency: formData.get('currency') || 'EUR',
    initialBalance: Number(formData.get('initialBalance')),
    interestRate: formData.get('interestRate') ? Number(formData.get('interestRate')) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  if (!(await requireUser(supabase))) return { error: NO_SESSION_ERROR }
  const { data: current } = await supabase
    .from('accounts')
    .select('interest_next_date')
    .eq('id', id)
    .maybeSingle()
  const rate = parsed.data.interestRate ?? null
  // Al activar el interés, el primer abono es el día 1 del mes que viene; si ya estaba
  // activo, se mantiene la fecha (cambiar el % no repite ni salta ningún mes).
  const nextDate = rate ? (current?.interest_next_date ?? firstOfNextMonth(today())) : null

  // La moneda no se edita: los movimientos ya registrados están en la moneda original.
  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      initial_balance_cents: eurosToCents(parsed.data.initialBalance),
      interest_rate: rate,
      interest_next_date: nextDate,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: userError(error) }
  }
  if (!data) {
    return { error: 'La cuenta no existe' }
  }

  revalidatePath('/accounts')
  revalidatePath('/')
  return { success: true }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  if (!(await requireUser(supabase))) return { error: NO_SESSION_ERROR }

  // Desde la migración 0004 sus movimientos (y las filas de adjuntos) se borran en
  // cascada, pero los archivos de Storage no: se apuntan antes y se borran después.
  const paths: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data: page, error: pathsError } = await supabase
      .from('attachments')
      .select('id, storage_path, transactions!inner(account_id)')
      .eq('transactions.account_id', id)
      .order('id')
      .range(from, from + 999)
    if (pathsError) return { error: userError(pathsError) }
    paths.push(...(page ?? []).map((a) => a.storage_path))
    if ((page?.length ?? 0) < 1000) break
  }

  const { data: deleted, error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    return { error: userError(error) }
  }
  // La RLS convierte un id ajeno o inexistente en «0 filas», no en error.
  if (!deleted?.length) return { error: 'No se ha encontrado: puede que ya estuviera borrado' }

  // Con la cuenta ya borrada; si algún archivo no se puede quitar, queda registrado.
  if (paths.length > 0) await removeAttachmentFiles(supabase, paths)

  revalidatePath('/accounts')
  revalidatePath('/')
  return { success: true }
}

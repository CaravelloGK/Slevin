'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const profileSchema = z.object({
  name: z.string().min(1, 'Имя обязательно').max(60).trim(),
  nickname: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/, 'Только латиница, цифры и _')
    .max(20)
    .optional()
    .transform((v) => v || null),
})

export async function updateProfile(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    nickname: formData.get('nickname'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Не авторизован' }

  const { error } = await supabase
    .from('players')
    .update({ name: parsed.data.name, nickname: parsed.data.nickname })
    .eq('user_id', user.id)

  if (error) return { success: false, error: 'Ошибка сохранения' }

  revalidatePath('/profile')
  return { success: true }
}

export async function updateAvatarUrl(
  url: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Не авторизован' }

  const { error } = await supabase
    .from('players')
    .update({ avatar_url: url })
    .eq('user_id', user.id)

  if (error) return { success: false, error: 'Ошибка сохранения' }

  revalidatePath('/profile')
  return { success: true }
}

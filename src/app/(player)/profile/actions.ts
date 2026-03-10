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

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Введите текущий пароль'),
  new_password: z.string().min(8, 'Новый пароль — минимум 8 символов'),
  confirm_password: z.string().min(1, 'Повторите новый пароль'),
})

export async function changePassword(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = changePasswordSchema.safeParse({
    current_password: formData.get('current_password'),
    new_password: formData.get('new_password'),
    confirm_password: formData.get('confirm_password'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }
  }

  const { current_password, new_password, confirm_password } = parsed.data

  if (new_password !== confirm_password) {
    return { success: false, error: 'Новые пароли не совпадают' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, error: 'Не авторизован' }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  })
  if (signInError) return { success: false, error: 'Неверный текущий пароль' }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({ password: new_password })
  if (updateError) return { success: false, error: 'Ошибка смены пароля' }

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

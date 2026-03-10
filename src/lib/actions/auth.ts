'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type SignInState = { error: string } | null

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Invalid email or password format.' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

const signUpSchema = z.object({
  name: z.string().min(1, 'Введите имя').max(60).trim(),
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
})

export type SignUpState = { error: string } | null

export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.data === undefined ? parsed.error.issues[0]?.message ?? 'Некорректные данные' : 'Некорректные данные' }
  }

  const supabase = await createServerClient()

  const { data, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!data.user) {
    return { error: 'Не удалось создать аккаунт' }
  }

  // Create player profile linked to auth user
  // Use admin client to bypass RLS (user has no active session yet if email unconfirmed)
  const admin = createAdminClient()
  const { error: playerError } = await admin
    .from('players')
    .insert({ name: parsed.data.name, user_id: data.user.id })

  if (playerError) {
    return { error: 'Аккаунт создан, но не удалось создать профиль игрока' }
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

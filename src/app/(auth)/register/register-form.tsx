'use client'

import { useActionState } from 'react'
import { signUp, type SignUpState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUp, null)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Имя</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Иван Иванов"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Эл. почта</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Минимум 6 символов"
          disabled={pending}
        />
      </div>

      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Создание аккаунта...' : 'Зарегистрироваться'}
      </Button>
    </form>
  )
}

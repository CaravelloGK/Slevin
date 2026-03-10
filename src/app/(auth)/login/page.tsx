import Link from 'next/link'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="w-full max-w-sm space-y-6 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Slevin</h1>
        <p className="text-muted-foreground text-sm">Войдите в аккаунт</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Нет аккаунта?{' '}
        <Link href="/register" className="underline underline-offset-4 hover:text-foreground">
          Зарегистрироваться
        </Link>
      </p>
    </main>
  )
}

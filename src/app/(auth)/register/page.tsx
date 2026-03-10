import Link from 'next/link'
import { RegisterForm } from './register-form'

export default function RegisterPage() {
  return (
    <main className="w-full max-w-sm space-y-6 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Slevin</h1>
        <p className="text-muted-foreground text-sm">Создайте аккаунт</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Войти
        </Link>
      </p>
    </main>
  )
}

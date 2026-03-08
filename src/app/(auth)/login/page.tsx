import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="w-full max-w-sm space-y-6 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Slevin</h1>
        <p className="text-muted-foreground text-sm">Войдите в аккаунт</p>
      </div>
      <LoginForm />
    </main>
  )
}

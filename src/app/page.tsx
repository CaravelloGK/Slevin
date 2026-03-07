import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = user.user_metadata?.role as string | undefined

  if (role === 'admin') {
    redirect('/admin/tournaments')
  }

  if (role === 'dealer') {
    redirect('/admin/tournaments')
  }

  // player — no specific redirect yet
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Slevin</h1>
      <p className="text-muted-foreground mt-2 text-sm">Welcome, {user.email}</p>
    </main>
  )
}

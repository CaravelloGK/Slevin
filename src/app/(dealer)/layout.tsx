import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Barlow_Condensed, Space_Mono, Bebas_Neue } from 'next/font/google'

const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas',
  subsets: ['latin'],
  weight: ['400'],
})

export default async function DealerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.user_metadata?.role as string | undefined
  if (!user || (role !== 'admin' && role !== 'dealer')) {
    redirect('/')
  }

  return (
    <div
      className={`${barlowCondensed.variable} ${spaceMono.variable} ${bebasNeue.variable}`}
      style={{ fontFamily: 'var(--font-barlow), system-ui, sans-serif' }}
    >
      {children}
    </div>
  )
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { dispatchMutation } from '@/lib/offline/dispatch-mutation'
import { recordKnockout, recordRebuy } from '@/lib/actions/tournament'

const mutationSchema = z.object({
  id: z.string(),
  action: z.string(),
  payload: z.record(z.string(), z.unknown()),
  enqueuedAt: z.number(),
  attempts: z.number(),
})

export async function POST(request: Request) {
  // Auth check — only authenticated users can replay their own mutations
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = mutationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid mutation shape' }, { status: 400 })
  }

  const result = await dispatchMutation(parsed.data, { recordKnockout, recordRebuy })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  return NextResponse.json({ ok: true })
}

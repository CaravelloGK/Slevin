// Supabase Edge Function: bounty/adjust
// POST /functions/v1/bounty/adjust
// Body: { tournament_id, player_id, delta, reason }
// Only admin role can call this function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processAdjust, validateAdjustRequest } from './logic.ts'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ success: false, error: 'Missing authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await callerClient.auth.getUser()

  if (authError || !user) {
    return json({ success: false, error: 'Unauthorized', code: 'AUTH_ERROR' }, 401)
  }

  // Manual bounty adjustment is admin-only
  const role = user.user_metadata?.role as string | undefined
  if (role !== 'admin') {
    return json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const validated = validateAdjustRequest(body)
  if (!validated) {
    return json({ success: false, error: 'Invalid request body', code: 'VALIDATION_ERROR' }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const result = await processAdjust(validated, {
    supabase,
    actorPlayerId: user.id,
  })

  if (!result.success) {
    const status = result.code === 'BOUNTY_BELOW_ZERO' ? 422 : 500
    return json(result, status)
  }

  return json(result, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

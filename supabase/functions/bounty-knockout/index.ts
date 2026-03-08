// Supabase Edge Function: bounty/knockout
// POST /functions/v1/bounty/knockout
// Body: { tournament_id, killer_id, victim_id }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processKnockout, validateKnockoutRequest } from './logic.ts'

const ALLOWED_ROLES = new Set(['admin', 'dealer'])

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405)
  }

  // Extract and verify JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ success: false, error: 'Missing authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify caller token to extract role
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await callerClient.auth.getUser()

  if (authError || !user) {
    return json({ success: false, error: 'Unauthorized', code: 'AUTH_ERROR' }, 401)
  }

  const role = user.user_metadata?.role as string | undefined
  if (!role || !ALLOWED_ROLES.has(role)) {
    return json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }

  // Parse and validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const validated = validateKnockoutRequest(body)
  if (!validated) {
    return json({ success: false, error: 'Invalid request body', code: 'VALIDATION_ERROR' }, 400)
  }

  // Service-role client for transactional mutations
  const supabase = createClient(supabaseUrl, supabaseKey)

  const result = await processKnockout(validated, {
    supabase,
    actorPlayerId: user.id,
  })

  if (!result.success) {
    return json(result, 500)
  }

  return json(result, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

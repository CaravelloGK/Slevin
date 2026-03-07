import { z } from 'zod'
import type { ApiResponse } from '@/types/api'

export interface QueuedMutation {
  id: string
  action: string
  payload: Record<string, unknown>
  enqueuedAt: number
  attempts: number
}

export interface ActionMap {
  recordKnockout: (payload: {
    tournament_id: string
    killer_id: string
    victim_id: string
  }) => Promise<ApiResponse<unknown>>
  recordRebuy: (payload: {
    tournament_id: string
    player_id: string
  }) => Promise<ApiResponse<unknown>>
}

export type DispatchResult = { ok: true } | { ok: false; error: string }

const knockoutSchema = z.object({
  tournament_id: z.string().uuid(),
  killer_id: z.string().uuid(),
  victim_id: z.string().uuid(),
})

const rebuySchema = z.object({
  tournament_id: z.string().uuid(),
  player_id: z.string().uuid(),
})

export async function dispatchMutation(
  mutation: QueuedMutation,
  actions: ActionMap,
): Promise<DispatchResult> {
  switch (mutation.action) {
    case 'recordKnockout': {
      const parsed = knockoutSchema.safeParse(mutation.payload)
      if (!parsed.success) return { ok: false, error: 'invalid_payload' }
      const result = await actions.recordKnockout(parsed.data)
      return result.success ? { ok: true } : { ok: false, error: result.error }
    }

    case 'recordRebuy': {
      const parsed = rebuySchema.safeParse(mutation.payload)
      if (!parsed.success) return { ok: false, error: 'invalid_payload' }
      const result = await actions.recordRebuy(parsed.data)
      return result.success ? { ok: true } : { ok: false, error: result.error }
    }

    default:
      return { ok: false, error: 'unknown_action' }
  }
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registerPlayer, removePlayerFromTournament, startTournament } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Player, Tournament, TournamentPlayerWithProfile } from '@/types/tournament'

interface PlayerRegistrationProps {
  tournament: Tournament
  registeredPlayers: TournamentPlayerWithProfile[]
  allPlayers: Player[]
}

export function PlayerRegistration({
  tournament,
  registeredPlayers,
  allPlayers,
}: PlayerRegistrationProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const registeredIds = new Set(registeredPlayers.map((rp) => rp.player_id))
  const unregistered = allPlayers.filter((p) => !registeredIds.has(p.id))

  function handleRegister(playerId: string) {
    setError(null)
    startTransition(async () => {
      const result = await registerPlayer({ tournament_id: tournament.id, player_id: playerId })
      if (!result.success) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleRemove(playerId: string) {
    setError(null)
    startTransition(async () => {
      const result = await removePlayerFromTournament({
        tournament_id: tournament.id,
        player_id: playerId,
      })
      if (!result.success) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleStart() {
    setError(null)
    startTransition(async () => {
      const result = await startTournament({ tournament_id: tournament.id })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(`/tournament/${tournament.id}/dealer`)
    })
  }

  const canStart = registeredPlayers.length >= 2 && tournament.status === 'pending'

  return (
    <div className="space-y-8">
      {/* Registered players */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            Зарегистрированные игроки
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({registeredPlayers.length})
            </span>
          </h2>
          <Badge variant={registeredPlayers.length >= 2 ? 'default' : 'secondary'}>
            {registeredPlayers.length < 2 ? 'Нужно минимум 2' : 'Готово'}
          </Badge>
        </div>

        {registeredPlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Игроков пока нет.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Имя</th>
                  <th className="px-4 py-2 text-left font-medium">Никнейм</th>
                  <th className="px-4 py-2 text-left font-medium">Стартовый баунти</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {registeredPlayers.map((rp) => (
                  <tr key={rp.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{rp.player.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{rp.player.nickname ?? '-'}</td>
                    <td className="px-4 py-2">${rp.current_bounty}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleRemove(rp.player_id)}
                      >
                        Убрать
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Separator />

      {/* Available players */}
      <section>
        <h2 className="font-semibold mb-3">
          Добавить игроков
          <span className="ml-2 text-muted-foreground font-normal text-sm">
            ({unregistered.length} доступно)
          </span>
        </h2>

        {unregistered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Все игроки уже зарегистрированы.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Имя</th>
                  <th className="px-4 py-2 text-left font-medium">Никнейм</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {unregistered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.nickname ?? '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleRegister(p.id)}
                      >
                        Добавить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Start tournament */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {canStart
            ? 'Турнир готов к запуску.'
            : 'Зарегистрируйте минимум 2 игрока для старта.'}
        </p>
        <Button size="lg" disabled={!canStart || isPending} onClick={handleStart}>
          {isPending ? 'Запуск...' : 'Начать турнир'}
        </Button>
      </div>
    </div>
  )
}

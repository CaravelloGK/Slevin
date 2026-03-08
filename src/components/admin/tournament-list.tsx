'use client'

import { useState, useTransition } from 'react'
import { createTournament } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Tournament, BlindStructure } from '@/types/tournament'

interface TournamentListProps {
  tournaments: Tournament[]
  structures: BlindStructure[]
}

interface TournamentFormState {
  name: string
  bounty_amount: string
  blind_structure_id: string
}

const STATUS_LABELS: Record<Tournament['status'], string> = {
  pending: 'Ожидает',
  running: 'Идёт',
  paused: 'Пауза',
  finished: 'Завершён',
}

const STATUS_VARIANT: Record<Tournament['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  running: 'default',
  paused: 'outline',
  finished: 'secondary',
}

export function TournamentList({ tournaments, structures }: TournamentListProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TournamentFormState>({
    name: '',
    bounty_amount: '20',
    blind_structure_id: structures[0]?.id ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    const bounty = parseInt(form.bounty_amount, 10)
    if (isNaN(bounty) || bounty < 0) {
      setError('Баунти должно быть неотрицательным числом')
      return
    }
    if (!form.blind_structure_id) {
      setError('Выберите структуру блайндов')
      return
    }

    startTransition(async () => {
      const result = await createTournament({
        name: form.name,
        bounty_amount: bounty,
        blind_structure_id: form.blind_structure_id,
      })

      if (!result.success) {
        setError(result.error)
        return
      }
      setOpen(false)
      setForm({ name: '', bounty_amount: '20', blind_structure_id: structures[0]?.id ?? '' })
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{tournaments.length} турниров</p>
        <Button onClick={() => { setError(null); setOpen(true) }} disabled={structures.length === 0}>
          {structures.length === 0 ? 'Сначала создайте структуру' : 'Новый турнир'}
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Название</th>
              <th className="px-4 py-3 text-left font-medium">Баунти</th>
              <th className="px-4 py-3 text-left font-medium">Статус</th>
              <th className="px-4 py-3 text-left font-medium">Создан</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Турниров пока нет.
                </td>
              </tr>
            )}
            {tournaments.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">${t.bounty_amount}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {t.status === 'pending' && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/tournaments/${t.id}/register`}>Регистрация игроков</a>
                    </Button>
                  )}
                  {(t.status === 'running' || t.status === 'paused') && (
                    <Button size="sm" asChild>
                      <a href={`/tournament/${t.id}/dealer`}>Панель дилера</a>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый турнир</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Название</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Пятничный покер"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bounty">Сумма баунти ($)</Label>
              <Input
                id="bounty"
                type="number"
                min={0}
                value={form.bounty_amount}
                onChange={(e) => setForm((f) => ({ ...f, bounty_amount: e.target.value }))}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="structure">Структура блайндов</Label>
              <select
                id="structure"
                value={form.blind_structure_id}
                onChange={(e) => setForm((f) => ({ ...f, blind_structure_id: e.target.value }))}
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Отмена
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
                {isPending ? 'Создание...' : 'Создать турнир'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

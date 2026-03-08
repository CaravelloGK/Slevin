'use client'

import { useState, useTransition } from 'react'
import { createPlayer, updatePlayer } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Player } from '@/types/tournament'

interface PlayerListProps {
  players: Player[]
}

interface PlayerFormState {
  name: string
  nickname: string
}

const emptyForm: PlayerFormState = { name: '', nickname: '' }

export function PlayerList({ players }: PlayerListProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [form, setForm] = useState<PlayerFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  function openEdit(player: Player) {
    setEditing(player)
    setForm({ name: player.name, nickname: player.nickname ?? '' })
    setError(null)
    setOpen(true)
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = editing
        ? await updatePlayer({ id: editing.id, name: form.name, nickname: form.nickname || undefined })
        : await createPlayer({ name: form.name, nickname: form.nickname || undefined })

      if (!result.success) {
        setError(result.error)
        return
      }
      setOpen(false)
      setForm(emptyForm)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{players.length} игроков</p>
        <Button onClick={openCreate}>Добавить игрока</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Имя</th>
              <th className="px-4 py-3 text-left font-medium">Никнейм</th>
              <th className="px-4 py-3 text-left font-medium">Добавлен</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {players.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Игроков пока нет.
                </td>
              </tr>
            )}
            {players.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.nickname ?? '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    Редактировать
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать игрока' : 'Добавить игрока'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Полное имя"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nickname">Никнейм (необязательно)</Label>
              <Input
                id="nickname"
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder="Игровой никнейм"
                disabled={isPending}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Отмена
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
                {isPending ? 'Сохранение...' : editing ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

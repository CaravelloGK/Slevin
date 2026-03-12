'use client'

import { useState, useTransition, useRef } from 'react'
import { createTournament, updateTournamentPoster, resetDealerRole } from '@/lib/actions/admin'
import { createBrowserClient } from '@/lib/supabase/client'
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
  entry_fee: string
  blind_structure_id: string
}

interface PrizePlaceForm {
  percentage: string
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

const ORDINALS = ['1-е', '2-е', '3-е', '4-е', '5-е', '6-е', '7-е', '8-е']

export function TournamentList({ tournaments, structures }: TournamentListProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TournamentFormState>({
    name: '',
    bounty_amount: '1000',
    entry_fee: '4000',
    blind_structure_id: structures[0]?.id ?? '',
  })
  const [prizePlaces, setPrizePlaces] = useState<PrizePlaceForm[]>([
    { percentage: '65' },
    { percentage: '25' },
    { percentage: '10' },
  ])
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const posterInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalPct = prizePlaces.reduce((s, p) => s + (parseInt(p.percentage, 10) || 0), 0)
  const pctValid = totalPct === 100
  const entryFeeNum = parseInt(form.entry_fee, 10) || 0

  function updatePrizePlace(idx: number, val: string) {
    setPrizePlaces((prev) => prev.map((p, i) => (i === idx ? { percentage: val } : p)))
  }

  function addPrizePlace() {
    if (prizePlaces.length >= 8) return
    setPrizePlaces((prev) => [...prev, { percentage: '0' }])
  }

  function removePrizePlace() {
    if (prizePlaces.length <= 1) return
    setPrizePlaces((prev) => prev.slice(0, -1))
  }

  function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPosterFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPosterPreview(url)
    } else {
      setPosterPreview(null)
    }
  }

  function resetForm() {
    setForm({ name: '', bounty_amount: '20', entry_fee: '4000', blind_structure_id: structures[0]?.id ?? '' })
    setPrizePlaces([{ percentage: '65' }, { percentage: '25' }, { percentage: '10' }])
    setPosterFile(null)
    setPosterPreview(null)
  }

  function handleSubmit() {
    setError(null)
    const bounty = parseInt(form.bounty_amount, 10)
    if (isNaN(bounty) || bounty < 0) {
      setError('Баунти должно быть неотрицательным числом')
      return
    }
    const entryFee = parseInt(form.entry_fee, 10)
    if (isNaN(entryFee) || entryFee < 0) {
      setError('Взнос должен быть неотрицательным числом')
      return
    }
    if (!form.blind_structure_id) {
      setError('Выберите структуру блайндов')
      return
    }
    if (prizePlaces.length > 0 && !pctValid) {
      setError('Сумма процентов призового фонда должна равняться 100%')
      return
    }

    const prize_distribution = prizePlaces.map((p, i) => ({
      position: i + 1,
      percentage: parseInt(p.percentage, 10) || 0,
    }))

    startTransition(async () => {
      const result = await createTournament({
        name: form.name,
        bounty_amount: bounty,
        entry_fee: entryFee,
        prize_distribution,
        blind_structure_id: form.blind_structure_id,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      const tournamentId = result.data.id

      // Upload poster if selected
      if (posterFile) {
        const supabase = createBrowserClient()
        const ext = posterFile.name.split('.').pop() ?? 'jpg'
        const path = `${tournamentId}/poster.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('tournament-posters')
          .upload(path, posterFile, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('tournament-posters')
            .getPublicUrl(path)
          if (urlData?.publicUrl) {
            await updateTournamentPoster({
              tournament_id: tournamentId,
              poster_url: urlData.publicUrl,
            })
          }
        }
      }

      setOpen(false)
      resetForm()
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
                <td className="px-4 py-3">{t.bounty_amount}<span style={{ fontSize: '0.75em' }}> ₽</span></td>
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
                  {t.status === 'finished' && (
                    <div className="flex items-center justify-end gap-2">
                      {t.dealer_player_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await resetDealerRole({ tournament_id: t.id })
                            })
                          }}
                        >
                          Сбросить дилера
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/club/${t.id}`}>Статистика</a>
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новый турнир</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Basic fields */}
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
              <Label htmlFor="bounty">Сумма баунти (₽)</Label>
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
              <Label htmlFor="entry-fee">Взнос за участие (₽)</Label>
              <Input
                id="entry-fee"
                type="number"
                min={0}
                value={form.entry_fee}
                onChange={(e) => setForm((f) => ({ ...f, entry_fee: e.target.value }))}
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

            {/* Poster upload */}
            <div className="space-y-1.5">
              <Label>Постер турнира (необязательно)</Label>
              <div
                className="border border-dashed border-border rounded-md p-4 flex flex-col items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => posterInputRef.current?.click()}
              >
                {posterPreview ? (
                  <div className="h-24 w-full flex items-center justify-center">
                    <img
                      src={posterPreview}
                      alt="Постер"
                      className="h-full w-auto max-w-full object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                    <span className="text-sm">Нажмите для загрузки изображения</span>
                    <span className="text-xs">JPG, PNG, WEBP до 5 МБ</span>
                  </div>
                )}
                {posterPreview && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPosterFile(null)
                      setPosterPreview(null)
                      if (posterInputRef.current) posterInputRef.current.value = ''
                    }}
                  >
                    Удалить
                  </button>
                )}
              </div>
              <input
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePosterChange}
                disabled={isPending}
              />
            </div>

            {/* Prize distribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Призовые места (%)</Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={removePrizePlace}
                    disabled={prizePlaces.length <= 1 || isPending}
                    className="w-6 h-6 rounded text-xs font-bold border border-border hover:bg-muted disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={addPrizePlace}
                    disabled={prizePlaces.length >= 8 || isPending}
                    className="w-6 h-6 rounded text-xs font-bold border border-border hover:bg-muted disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                {prizePlaces.map((place, idx) => {
                  const pct = parseInt(place.percentage, 10) || 0
                  const amount = entryFeeNum > 0 ? Math.round(entryFeeNum * pct / 100) : null
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground w-24 shrink-0 whitespace-nowrap">
                        {ORDINALS[idx] ?? `${idx + 1}-е`} место
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={place.percentage}
                          onChange={(e) => updatePrizePlace(idx, e.target.value)}
                          disabled={isPending}
                          className="h-7 text-sm w-20"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  )
                })}

                <div className="pt-1 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Итого</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: pctValid ? 'var(--color-green-600, #16a34a)' : totalPct > 100 ? 'var(--color-red-600, #dc2626)' : undefined }}
                  >
                    {totalPct}%{pctValid ? ' ✓' : totalPct > 100 ? ' — превышает 100%' : ''}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Суммарный процент должен быть равен 100%. Призы рассчитываются от призового фонда.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { resetForm(); setOpen(false) }} disabled={isPending}>
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

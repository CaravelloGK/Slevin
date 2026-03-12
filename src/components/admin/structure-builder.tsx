'use client'

import { useState, useTransition } from 'react'
import { createBlindStructure, addBlindLevel, updateBlindLevel, deleteBlindLevel } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { BlindStructure, BlindLevel } from '@/types/tournament'

interface StructureWithLevels extends BlindStructure {
  blind_levels: BlindLevel[]
}

interface StructureBuilderProps {
  structures: StructureWithLevels[]
}

interface LevelFormState {
  small_blind: string
  big_blind: string
  ante: string
  duration_minutes: string
}

const emptyLevel: LevelFormState = { small_blind: '', big_blind: '', ante: '0', duration_minutes: '15' }

function levelToForm(lvl: BlindLevel): LevelFormState {
  return {
    small_blind: String(lvl.small_blind),
    big_blind: String(lvl.big_blind),
    ante: String(lvl.ante),
    duration_minutes: String(lvl.duration_minutes),
  }
}

export function StructureBuilder({ structures }: StructureBuilderProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [newStructureName, setNewStructureName] = useState('')
  const [structureError, setStructureError] = useState<string | null>(null)

  const [addLevelOpen, setAddLevelOpen] = useState(false)
  const [targetStructureId, setTargetStructureId] = useState<string | null>(null)
  const [levelForm, setLevelForm] = useState<LevelFormState>(emptyLevel)
  const [levelError, setLevelError] = useState<string | null>(null)

  // Collapsed state — all collapsed by default
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Inline edit state: levelId -> form values
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<LevelFormState>(emptyLevel)
  const [editError, setEditError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleCreateStructure() {
    setStructureError(null)
    startTransition(async () => {
      const result = await createBlindStructure({ name: newStructureName })
      if (!result.success) {
        setStructureError(result.error)
        return
      }
      setCreateOpen(false)
      setNewStructureName('')
    })
  }

  function openAddLevel(structureId: string) {
    setTargetStructureId(structureId)
    setLevelForm(emptyLevel)
    setLevelError(null)
    setAddLevelOpen(true)
  }

  function handleAddLevel(structure: StructureWithLevels) {
    setLevelError(null)
    const sb = parseInt(levelForm.small_blind, 10)
    const bb = parseInt(levelForm.big_blind, 10)
    const ante = parseInt(levelForm.ante, 10)
    const durationMin = parseInt(levelForm.duration_minutes, 10)

    if (isNaN(sb) || sb < 1) { setLevelError('Малый блайнд должен быть не менее 1'); return }
    if (isNaN(bb) || bb < 1) { setLevelError('Большой блайнд должен быть не менее 1'); return }
    if (isNaN(durationMin) || durationMin < 1) { setLevelError('Длительность должна быть не менее 1 минуты'); return }

    const nextLevel = (structure.blind_levels.length > 0
      ? Math.max(...structure.blind_levels.map((l) => l.level_number)) + 1
      : 1)

    startTransition(async () => {
      const result = await addBlindLevel({
        blind_structure_id: structure.id,
        level_number: nextLevel,
        small_blind: sb,
        big_blind: bb,
        ante: isNaN(ante) ? 0 : ante,
        duration_minutes: durationMin,
      })
      if (!result.success) {
        setLevelError(result.error)
        return
      }
      setAddLevelOpen(false)
    })
  }

  function startEdit(lvl: BlindLevel) {
    setEditingId(lvl.id)
    setEditForm(levelToForm(lvl))
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  function handleSaveEdit(lvl: BlindLevel) {
    setEditError(null)
    const sb = parseInt(editForm.small_blind, 10)
    const bb = parseInt(editForm.big_blind, 10)
    const ante = parseInt(editForm.ante, 10)
    const dur = parseInt(editForm.duration_minutes, 10)

    if (isNaN(sb) || sb < 1) { setEditError('МБ должен быть не менее 1'); return }
    if (isNaN(bb) || bb < 1) { setEditError('ББ должен быть не менее 1'); return }
    if (isNaN(dur) || dur < 1) { setEditError('Длительность должна быть не менее 1 мин'); return }

    startTransition(async () => {
      const result = await updateBlindLevel({
        id: lvl.id,
        blind_structure_id: lvl.blind_structure_id,
        small_blind: sb,
        big_blind: bb,
        ante: isNaN(ante) ? 0 : ante,
        duration_minutes: dur,
      })
      if (!result.success) {
        setEditError(result.error)
        return
      }
      setEditingId(null)
    })
  }

  function handleDeleteLevel(levelId: string, structureId: string) {
    startTransition(async () => {
      await deleteBlindLevel({ id: levelId, blind_structure_id: structureId })
    })
  }

  const targetStructure = structures.find((s) => s.id === targetStructureId) ?? null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{structures.length} структур</p>
        <Button onClick={() => { setStructureError(null); setNewStructureName(''); setCreateOpen(true) }}>
          Новая структура
        </Button>
      </div>

      {structures.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Структур блайндов пока нет. Создайте первую.
        </p>
      )}

      {structures.map((structure) => {
        const isExpanded = expandedIds.has(structure.id)
        return (
          <div key={structure.id} className="rounded-md border">
            {/* Collapsible header */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              onClick={() => toggleExpanded(structure.id)}
            >
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground shrink-0 transition-transform duration-150"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <path d="M5 2l5 5-5 5" />
                </svg>
                <span className="font-medium">{structure.name}</span>
                <span className="text-xs text-muted-foreground">
                  {structure.blind_levels.length} уровн.
                </span>
              </div>
              <div
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAddLevel(structure.id)}
                  disabled={isPending}
                >
                  Добавить уровень
                </Button>
              </div>
            </button>

            {isExpanded && (
              <>
                <Separator />

                {editError && (
                  <p className="px-4 py-2 text-sm text-destructive">{editError}</p>
                )}

                {structure.blind_levels.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground">Уровней пока нет.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Уровень</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">МБ</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ББ</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Анте</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Длит.</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {structure.blind_levels.map((lvl) => {
                        const isEditing = editingId === lvl.id
                        return (
                          <tr key={lvl.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2 font-medium">{lvl.level_number}</td>

                            {isEditing ? (
                              <>
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={editForm.small_blind}
                                    onChange={(e) => setEditForm((f) => ({ ...f, small_blind: e.target.value }))}
                                    className="h-7 w-20 text-sm"
                                    disabled={isPending}
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={editForm.big_blind}
                                    onChange={(e) => setEditForm((f) => ({ ...f, big_blind: e.target.value }))}
                                    className="h-7 w-20 text-sm"
                                    disabled={isPending}
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={editForm.ante}
                                    onChange={(e) => setEditForm((f) => ({ ...f, ante: e.target.value }))}
                                    className="h-7 w-20 text-sm"
                                    disabled={isPending}
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={editForm.duration_minutes}
                                    onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                                    className="h-7 w-20 text-sm"
                                    disabled={isPending}
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      disabled={isPending}
                                      onClick={() => handleSaveEdit(lvl)}
                                    >
                                      {isPending ? '...' : 'Сохранить'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={isPending}
                                      onClick={cancelEdit}
                                    >
                                      Отмена
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2">{lvl.small_blind}</td>
                                <td className="px-4 py-2">{lvl.big_blind}</td>
                                <td className="px-4 py-2">{lvl.ante}</td>
                                <td className="px-4 py-2">{lvl.duration_minutes} мин</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={isPending}
                                      onClick={() => startEdit(lvl)}
                                    >
                                      Изменить
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      disabled={isPending}
                                      onClick={() => handleDeleteLevel(lvl.id, structure.id)}
                                    >
                                      Удалить
                                    </Button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* Create structure dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая структура блайндов</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="struct-name">Название структуры</Label>
              <Input
                id="struct-name"
                value={newStructureName}
                onChange={(e) => setNewStructureName(e.target.value)}
                placeholder="Стандарт 20 уровней"
                disabled={isPending}
              />
            </div>
            {structureError && <p className="text-sm text-destructive">{structureError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isPending}>
                Отмена
              </Button>
              <Button
                onClick={handleCreateStructure}
                disabled={isPending || !newStructureName.trim()}
              >
                {isPending ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add level dialog */}
      <Dialog open={addLevelOpen} onOpenChange={setAddLevelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Добавить уровень — {targetStructure?.name}
              {targetStructure && ` (Уровень ${targetStructure.blind_levels.length + 1})`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sb">Малый блайнд</Label>
                <Input
                  id="sb"
                  type="number"
                  min={1}
                  value={levelForm.small_blind}
                  onChange={(e) => setLevelForm((f) => ({ ...f, small_blind: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bb">Большой блайнд</Label>
                <Input
                  id="bb"
                  type="number"
                  min={1}
                  value={levelForm.big_blind}
                  onChange={(e) => setLevelForm((f) => ({ ...f, big_blind: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ante">Анте</Label>
                <Input
                  id="ante"
                  type="number"
                  min={0}
                  value={levelForm.ante}
                  onChange={(e) => setLevelForm((f) => ({ ...f, ante: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dur">Длительность (мин)</Label>
                <Input
                  id="dur"
                  type="number"
                  min={1}
                  value={levelForm.duration_minutes}
                  onChange={(e) => setLevelForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                  disabled={isPending}
                />
              </div>
            </div>
            {levelError && <p className="text-sm text-destructive">{levelError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddLevelOpen(false)} disabled={isPending}>
                Отмена
              </Button>
              <Button
                onClick={() => targetStructure && handleAddLevel(targetStructure)}
                disabled={isPending || !levelForm.small_blind || !levelForm.big_blind}
              >
                {isPending ? 'Добавление...' : 'Добавить уровень'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

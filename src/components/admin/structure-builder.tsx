'use client'

import { useState, useTransition } from 'react'
import { createBlindStructure, addBlindLevel, deleteBlindLevel } from '@/lib/actions/admin'
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

export function StructureBuilder({ structures }: StructureBuilderProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [newStructureName, setNewStructureName] = useState('')
  const [structureError, setStructureError] = useState<string | null>(null)

  const [addLevelOpen, setAddLevelOpen] = useState(false)
  const [targetStructureId, setTargetStructureId] = useState<string | null>(null)
  const [levelForm, setLevelForm] = useState<LevelFormState>(emptyLevel)
  const [levelError, setLevelError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

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

  function handleDeleteLevel(levelId: string, structureId: string) {
    startTransition(async () => {
      await deleteBlindLevel({ id: levelId, blind_structure_id: structureId })
    })
  }

  const targetStructure = structures.find((s) => s.id === targetStructureId) ?? null

  return (
    <div className="space-y-6">
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

      {structures.map((structure) => (
        <div key={structure.id} className="rounded-md border">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
            <span className="font-medium">{structure.name}</span>
            <Button size="sm" variant="outline" onClick={() => openAddLevel(structure.id)}>
              Добавить уровень
            </Button>
          </div>

          <Separator />

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
                {structure.blind_levels.map((lvl) => (
                  <tr key={lvl.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 font-medium">{lvl.level_number}</td>
                    <td className="px-4 py-2">{lvl.small_blind}</td>
                    <td className="px-4 py-2">{lvl.big_blind}</td>
                    <td className="px-4 py-2">{lvl.ante}</td>
                    <td className="px-4 py-2">{lvl.duration_minutes} мин</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleDeleteLevel(lvl.id, structure.id)}
                      >
                        Удалить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

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

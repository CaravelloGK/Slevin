import { createServerClient } from '@/lib/supabase/server'
import { StructureBuilder } from '@/components/admin/structure-builder'

export default async function StructuresPage() {
  const supabase = await createServerClient()

  const { data: structures } = await supabase
    .from('blind_structures')
    .select('id, created_at, name')
    .order('name', { ascending: true })
    .limit(100)

  const structureIds = (structures ?? []).map((s) => s.id)

  const { data: levels } =
    structureIds.length > 0
      ? await supabase
          .from('blind_levels')
          .select('id, blind_structure_id, level_number, small_blind, big_blind, ante, duration_minutes, is_break')
          .in('blind_structure_id', structureIds)
          .order('level_number', { ascending: true })
          .limit(1000)
      : { data: [] }

  const structuresWithLevels = (structures ?? []).map((s) => ({
    ...s,
    blind_levels: (levels ?? []).filter((l) => l.blind_structure_id === s.id),
  }))

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Структуры блайндов</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Создание и управление структурами блайндов для турниров.
        </p>
      </div>
      <StructureBuilder structures={structuresWithLevels} />
    </main>
  )
}
